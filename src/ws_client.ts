import axios from 'axios';
import WebSocket from 'ws';
import EventEmitter from 'events';
import config from './config';

export default class WsClient extends EventEmitter {
  public readonly id: string;
  public isReady = false;
  private configUrl: string;
  private ws: WebSocket | null;

  constructor(id = Math.random().toString().substring(2, 10), configUrl = config.wsConfigEndpoint) {
    super();

    this.id = id;
    this.configUrl = configUrl;
    this.ws = null;
  }

  async connect() {
    const res = await axios.get(this.configUrl);
    const url = `ws://${res.data.endpoint.host}:${res.data.endpoint.port}`;

    this.ws = new WebSocket(url, {
      headers: {
        ['x-client-id']: this.id,
      },
    })
      .on('error', (err) => {
        console.error(this.id, err);
        this.isReady = false;

        if (this.ws) {
          this.ws.removeAllListeners();
          this.ws.on('error', function suppress() {});
          this.ws.terminate();
          this.ws = null;
        }

        console.log(this.id, 'reconnecting');
        setTimeout(() => this.connect(), 1000);
      })
      .on('close', () => {
        console.log(this.id, 'disconnected');
        this.isReady = false;

        if (this.ws) {
          this.ws.removeAllListeners();
          this.ws = null;
        }

        console.log(this.id, 'reconnecting');
        setTimeout(() => this.connect(), 1000);
      })
      .on('open', () => {
        console.log(this.id, 'connected');

        this.isReady = true;
        this.emit('ready');
      })
      .on('message', (data) => {
        let payload: PubSubMessage;
        try {
          payload = JSON.parse(data.toString());
        } catch {
          console.warn(this.id, 'failed to parse message');
          return;
        }
        this.emit('message', payload);
      });

    console.log(this.id, 'connecting');
  }

  disconnect() {
    if (!this.ws) {
      return;
    }

    this.ws.close();
    this.ws.removeAllListeners();
    this.ws = null;

    console.log(this.id, 'disconnected');
  }

  send(message: PubSubMessage) {
    if (!this.ws) {
      return false;
    }

    this.ws.send(JSON.stringify(message));
    return true;
  }
}
