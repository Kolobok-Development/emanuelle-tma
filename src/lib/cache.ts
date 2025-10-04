import { redis } from './redis';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; 
  private static readonly COMPANION_TTL = 7200; 
  private static readonly USER_TTL = 1800; 

  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  static async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        return await redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  static async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    try {
      const cached = await this.get<T>(key);

      console.log('cached: ', cached);

      if (cached !== null) {
        return cached;
      }

      const value = await fallback();
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return null;
      }
    }
  }

  static keys = {
    companion: (id: string) => `companion:${id}`,
    companionByTelegramId: (telegramId: string) => `companion:telegram:${telegramId}`,
    user: (id: string) => `user:${id}`,
    userByTelegramId: (telegramId: string) => `user:telegram:${telegramId}`,
    allCompanions: () => 'companions:all',
  };

  static ttl = {
    companion: this.COMPANION_TTL,
    user: this.USER_TTL,
    default: this.DEFAULT_TTL,
  };

  static async invalidateCompanion(companionId?: string): Promise<void> {
    try {
      if (companionId) {
        await this.delete(this.keys.companion(companionId));
      }
      await this.delete(this.keys.allCompanions());
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  static async invalidateUser(userId?: string, telegramId?: string): Promise<void> {
    try {
      if (userId) {
        await this.delete(this.keys.user(userId));
      }
      if (telegramId) {
        await this.delete(this.keys.userByTelegramId(telegramId));
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  static async getStats(): Promise<{
    memory: string;
    keyspace: Record<string, string>;
    connectedClients: number;
  }> {
    try {
      const info = await redis.info();
      const lines = info.split('\r\n');
      
      const memory = lines.find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown';
      const connectedClients = parseInt(lines.find(line => line.startsWith('connected_clients:'))?.split(':')[1] || '0');
      
      const keyspace: Record<string, string> = {};
      lines.forEach(line => {
        if (line.startsWith('db')) {
          const [db, info] = line.split(':');
          keyspace[db] = info;
        }
      });

      return {
        memory,
        keyspace,
        connectedClients,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        memory: 'unknown',
        keyspace: {},
        connectedClients: 0,
      };
    }
  }
}
