import crypto from 'crypto';
import EventEmitter from 'events';
import Redis from 'ioredis';
import config from './config';

const WS_INSTANCES_KEY = 'instances';

export default class RedisStorage extends EventEmitter implements ISharedCache {
  private commandClient: Redis | null = null;
  private pubSubClient: Redis | null = null;

  connect() {
    if (this.commandClient || this.pubSubClient) {
      console.warn('Redis already connected');
      return this;
    }

    const options = {
      ...config.redis,
      lazyConnect: true,
      autoResubscribe: true,
    };

    this.commandClient = new Redis(options);
    this.pubSubClient = new Redis(options);
    this.pubSubClient.on('message', (channel, message) => {
      this.emit('message', channel, message);
    });

    Promise.all([this.commandClient.connect(), this.pubSubClient.connect()])
      .then(() => {
        console.info('Redis connected');
        this.emit('ready');
      })
      .catch(console.error);

    return this;
  }

  disconnect() {
    if (!(this.commandClient && this.pubSubClient)) {
      return;
    }

    this.pubSubClient.removeAllListeners();

    Promise.all([this.commandClient.quit(), this.pubSubClient.quit()])
      .then(() => console.info('Redis disconnected'))
      .catch(console.error);

    this.commandClient = null;
    this.pubSubClient = null;

    return this;
  }

  async reportActive(name: string, state: InstanceState): Promise<void> {
    if (!this.commandClient) {
      throw new Error('client is not connected');
    }

    await this.commandClient
      .multi()
      .hset(WS_INSTANCES_KEY, { [name]: JSON.stringify(state) })
      .call('hexpire', WS_INSTANCES_KEY, '30', 'FIELDS', '1', name)
      .exec();
  }

  async fetchAvailable(): Promise<InstanceState | null> {
    if (!this.commandClient) {
      throw new Error('client is not connected');
    }

    const instances = await this.commandClient.hgetall(WS_INSTANCES_KEY);

    if (instances) {
      const selected: InstanceState[] = [];

      for (const state of Object.values(instances)) {
        const instance: InstanceState = JSON.parse(state);

        if (!selected[0] || selected[0].clients > instance.clients) {
          selected.length = 0;
          selected.push(instance);
        } else if (selected[0].clients === instance.clients) {
          selected.push(instance);
        }
      }

      if (!selected.length) {
        return null;
      }

      return selected[crypto.randomInt(selected.length)];
    }

    return null;
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.commandClient) {
      throw new Error('client is not connected');
    }

    await this.commandClient.publish(channel, message);
  }

  async subscribe(...channels: string[]): Promise<void> {
    if (!this.pubSubClient) {
      throw new Error('client is not connected');
    }

    await this.pubSubClient.subscribe(...channels);
  }

  async unsubscribe(...channels: string[]): Promise<void> {
    if (!this.pubSubClient) {
      throw new Error('client is not connected');
    }

    await this.pubSubClient.unsubscribe(...channels);
  }
}
