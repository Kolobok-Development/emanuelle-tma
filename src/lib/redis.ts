import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

let bullmqConnection: Redis | null = null;

export const createRedisConnection = (): Redis => {
  if (bullmqConnection) {
    const status = bullmqConnection.status;
    if (status === 'connecting' || status === 'connect' || status === 'ready') {
      return bullmqConnection;
    }
    bullmqConnection = null;
  }

  bullmqConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  bullmqConnection.on('error', (err) => {
    console.error('BullMQ Redis connection error:', err);
  });

  bullmqConnection.on('connect', () => {
    console.log('BullMQ Redis connection established');
  });

  bullmqConnection.on('close', () => {
    console.log('BullMQ Redis connection closed');
    bullmqConnection = null;
  });

  return bullmqConnection;
};

export const closeRedisConnection = async () => {
  try {
    await redis.disconnect();
    if (bullmqConnection) {
      await bullmqConnection.quit();
      bullmqConnection = null;
    }
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
};

export const closeBullMQConnection = async () => {
  try {
    if (bullmqConnection) {
      await bullmqConnection.quit();
      bullmqConnection = null;
    }
  } catch (error) {
    console.error('Error closing BullMQ Redis connection:', error);
  }
};

