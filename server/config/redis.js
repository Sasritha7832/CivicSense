const Redis = require('ioredis');

let client = null;

const createRedisClient = () => {
  if (client) return client;

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('error', (err) => console.warn('⚠️  Redis error:', err.message));

  client.connect().catch(() => {
    console.warn('⚠️  Redis not available — real-time & queues will be limited');
  });

  return client;
};

const getRedisClient = () => client;

module.exports = { createRedisClient, getRedisClient };
