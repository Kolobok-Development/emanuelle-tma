import IORedis from 'ioredis';

export const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

// Return connection options for BullMQ instead of a Redis instance
// This avoids type conflicts between different ioredis versions
export const createRedisConnection = () => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };
};

export const closeRedisConnection = async () => {
  try {
    await redis.disconnect();
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
};