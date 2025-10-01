import { prisma } from '@/core/db/prisma';

export class UserService {
  static async getOrCreateUserByTelegramId(telegramUserId: bigint, username?: string): Promise<string> {
    try {
      let user = await prisma.users.findUnique({
        where: { telegram_id: telegramUserId },
      });

      if (!user) {
        user = await prisma.users.create({
          data: {
            telegram_id: telegramUserId,
            username: username || null,
            subscription_tier: 'FREE',
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

      return user.id;
    } catch (error) {
      console.error('Error getting or creating user by telegram ID:', error);
      throw error;
    }
  }

  static async getUserByTelegramId(telegramUserId: bigint) {
    try {
      return await prisma.users.findUnique({
        where: { telegram_id: telegramUserId },
      });
    } catch (error) {
      console.error('Error getting user by telegram ID:', error);
      return null;
    }
  }
}

