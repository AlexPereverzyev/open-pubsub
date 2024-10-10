import crypto from 'crypto';
import WsClient from './ws_client';

(async function () {
  const clientsCount = +process.argv[2] || 1;
  const clients: WsClient[] = [];
  const intervals: NodeJS.Timeout[] = [];

  for (let i = 0; i < clientsCount; i++) {
    const ws = new WsClient();

    ws.on('ready', () => {
      if (clientsCount < 2) {
        console.log('no clients to send');
        return;
      }

      intervals.push(
        setInterval(async () => {
          let toClient;
          let c = 0;

          do {
            toClient = clients[crypto.randomInt(clients.length)];
            await new Promise((r) => setTimeout(r, 10));
          } while ((!toClient.isReady || ws.id === toClient.id) && c++ < 10);

          if (toClient) {
            ws.send({ from: ws.id, to: toClient.id, msg: 'hello' });
            console.log(ws.id, 'sent');
          } else {
            console.log(ws.id, 'failed to select client');
          }
        }, 1_000)
      );
    });

    ws.on('message', (message: PubSubMessage) => {
      console.log(ws.id, 'received', message);
    });

    try {
      await ws.connect();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(ws.id, err.message);
      }
      console.error(ws.id, 'failed to connect');

      ws.disconnect();
      continue;
    }

    clients.push(ws);
  }

  setTimeout(() => {
    clients.forEach((ws) => ws.disconnect());
    intervals.forEach((i) => clearInterval(i));
  }, 10_000);
})();
