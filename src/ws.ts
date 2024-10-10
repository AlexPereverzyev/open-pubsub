import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import config from './config';

export default class WsServer {
  private server: WebSocketServer | null;
  private statusInterval: NodeJS.Timeout | null;
  private clients: Map<string, WebSocket>;

  constructor(private cache: ISharedCache) {
    this.server = null;
    this.statusInterval = null;
    this.clients = new Map();
    this.cache.on('message', async (channel, message) => {
      await this.handleMessage(channel, message);
    });
  }

  start(port = config.wsPort) {
    if (this.server) {
      console.warn('server already started');
      return;
    }

    this.server = new WebSocketServer({ port });
    this.server
      .on('listening', () => {
        console.info('Web Socket server started at port', port);
      })
      .on('connection', async (ws: WebSocket, req: IncomingMessage) => {
        const clientId = req.headers['x-client-id'] as string;

        if (!clientId) {
          console.warn('connection from unknown client');
          ws.terminate();
          return;
        }

        console.log(clientId, 'connected');

        this.clients.set(clientId, ws);

        ws.on('error', async (err: Error) => {
          console.error(clientId, err.message);

          this.clients.delete(clientId);

          ws.removeAllListeners();
          ws.on('error', function suppress() {});
          ws.terminate();

          try {
            await this.cache.unsubscribe(clientId);
          } catch {
            console.warn(clientId, 'failed to unsubscribe');
          }
        });

        ws.on('close', async () => {
          console.log(clientId, 'disconnected');

          this.clients.delete(clientId);

          ws.removeAllListeners();
          ws.on('error', function suppress() {});

          try {
            await this.cache.unsubscribe(clientId);
          } catch {
            console.warn(clientId, 'failed to unsubscribe');
          }
        });

        ws.on('message', async (data) => {
          await this.handleMessage(clientId, data.toString());
        });

        try {
          await this.cache.subscribe(clientId);
          console.log(clientId, 'subscribed');
        } catch {
          console.warn(clientId, 'failed to subscribe');
        }
      });

    this.updateStatus();
    this.statusInterval = setInterval(() => this.updateStatus(), config.stateSyncInterval);
  }

  stop() {
    if (!this.server) {
      return;
    }

    for (const ws of this.clients.values()) {
      ws.close();
    }

    this.server.close();
    this.server.removeAllListeners();
    this.server = null;

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    console.info('Web Socket server stopping');
  }

  async updateStatus() {
    try {
      await this.cache.reportActive(config.name, { endpoint: config.endpoint, clients: this.clients.size });
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      console.warn('failed to report status');
    }
  }

  private async handleMessage(clientId: string, payload: string) {
    let message: PubSubMessage;
    try {
      message = JSON.parse(payload);
    } catch {
      console.warn(clientId, 'failed to parse message');
      return;
    }

    if (!(message.from && message.to && message.msg)) {
      console.warn(clientId, 'invalid message');
      return;
    }

    if (message.from === message.to) {
      console.warn(clientId, 'message to self');
      return;
    }

    console.log(clientId, message.from, ' > ', message.to);

    const toClient = this.clients.get(message.to);

    if (toClient) {
      toClient.send(payload, (err?: Error) => {
        if (err) {
          console.error(clientId, err.message);
        }
      });
      console.debug(clientId, 'message delivered');
      return;
    }

    try {
      await this.cache.publish(message.to, payload);
      console.debug(clientId, 'message relayed');
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
      console.warn(clientId, 'failed to relay message');
    }
  }
}
