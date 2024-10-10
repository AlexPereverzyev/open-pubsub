# Open PubSub

Scalable messaging backend based on Web sockets and Redis Pub/Sub.

The backend consists of Web socket servers instances that accept client connections and can be easily scaled horizontally.

Before initiating Web socket connection, clients fetch Web socket server instance address using REST API, that tries to find instance with less connections to ensure balanced client connections distribution over all server instances.

When client is connected, server instance subscribes to Redis pub/sub channel corresponding to the client ID. From this point message routing is simple: if target client is connected to the same instance, its delivered over Web socket, otherwise - message is published to client's channel.

When Redis instance is at capacity, its possible to add more shards and use the existing late binding REST API to point clients to proper shards.

## Dev Stack

- Node.js 20
- TypeScript 5.6.2
- Redis 7.4+
- Docker
- Docker Compose
- Visual Studio Code
- ESLint
- Prettier

## Basic Usage

Start backend in Docker containers:
```
docker-compose up --build
```

Start 10 test clients that send message to random client every second:
```
npm run build
npm run client 10
```

Start Redis CLI on container:
```
docker exec -it open-pubsub_redis_1 redis-cli
```

Note, to start server locally for debugging:

```
npm install
npm run build
npm start
```

## References

- https://www.npmjs.com/package/ws
- https://www.npmjs.com/package/ioredis
- https://redis.io/docs/latest/develop/interact/pubsub/
