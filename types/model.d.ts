interface ISharedCache {
  reportActive(name: string, state: InstanceState): Promise<void>;
  fetchAvailable(): Promise<InstanceState | null>;
  subscribe(...channels: string[]): Promise<void>;
  unsubscribe(...channels: string[]): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  on(event: 'reconnect', cb: () => void): this;
  on(event: 'message', cb: (channel: string, message: string) => void): this;
}

interface InstanceState {
  endpoint: {
    host: string;
    port: number;
  };
  clients: number;
}

interface PubSubMessage {
  from: string;
  to: string;
  msg: string;
}
