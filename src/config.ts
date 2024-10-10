export default {
  name: process.env.HOSTNAME ?? 'api',
  restPort: 8080,
  wsPort: 8880,
  stateSyncInterval: 5_000,
  wsConfigEndpoint: 'http://localhost:8080/endpoint',
  endpoint: {
    port: +(process.env.WS_PORT ?? 8880),
    host: process.env.WS_HOST ?? 'localhost',
  },
  redis: {
    host: 'redis',
    port: 6379,
  },
};
