import { prisma } from '@/core/db/prisma';
import { CacheService } from './cache';

export class UserService {
  static async getOrCreateUserByTelegramId(telegramUserId: bigint, username?: string): Promise<string> {
    const cacheKey = CacheService.keys.userByTelegramId(telegramUserId.toString());
    
    const cachedUserId = await CacheService.get<string>(cacheKey);
    console.log('cachedUserId: ', cachedUserId);
    if (cachedUserId) {
      return cachedUserId;
    }

    try {
      let user = await prisma.users.findUnique({
        where: { telegram_id: telegramUserId },
      });

      if (!user) {
        user = await prisma.users.create({
          data: {
            telegram_id: telegramUserId,
            username: username || null,
            settings: {
              create: {
                tone: 'friendly',
                language: 'en',
              },
            },
          },
        });
      } else if (username && user.username !== username) {
        user = await prisma.users.update({
          where: { id: user.id },
          data: { username },
        });
      }

      await CacheService.set(cacheKey, user.id, CacheService.ttl.user);
      
      return user.id;
    } catch (error) {
      console.error('Error getting or creating user by telegram ID:', error);
      throw error;
    }
  }

  static async getUserByTelegramId(telegramUserId: bigint) {
    const cacheKey = CacheService.keys.userByTelegramId(telegramUserId.toString());
    
    return await CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          return await prisma.users.findUnique({
            where: { telegram_id: telegramUserId },
          });
        } catch (error) {
          console.error('Error getting user by telegram ID:', error);
          return null;
        }
      },
      CacheService.ttl.user
    );
  }

  static async getUserById(userId: string) {
    const cacheKey = CacheService.keys.user(userId);
    
    return await CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          return await prisma.users.findUnique({
            where: { id: userId },
            include: { settings: true },
          });
        } catch (error) {
          console.error('Error getting user by ID:', error);
          return null;
        }
      },
      CacheService.ttl.user
    );
  }

  static async updateUser(userId: string, data: Partial<{
    username: string;
    subscription_expires: Date;
  }>): Promise<void> {
    try {
      await prisma.users.update({
        where: { id: userId },
        data,
      });

      await CacheService.invalidateUser(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

