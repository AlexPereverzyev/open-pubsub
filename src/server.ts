import RestApp from './rest';
import WsApp from './ws';
import RedisStorage from './redis';

const cache = new RedisStorage();
const rest = new RestApp(cache);
const ws = new WsApp(cache);

const shutdown = () => {
  console.log();
  ws.stop();
  rest.stop();
  cache.disconnect();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

cache.connect().once('ready', () => {
  rest.start();
  ws.start();
});
