import { prisma } from '@/core/db/prisma';
import { CacheService } from './cache';
import { AICompanion } from '@prisma/client';

export class CompanionService {
  static async getCompanionById(id: string): Promise<AICompanion | null> {
    const cacheKey = CacheService.keys.companion(id);
    
    return await CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const companion = await prisma.aICompanion.findUnique({
            where: { id },
          });
          return companion;
        } catch (error) {
          console.error('Error fetching companion by ID:', error);
          return null;
        }
      },
      CacheService.ttl.companion
    );
  }

  static async getUserSelectedCompanion(telegramUserId: bigint): Promise<AICompanion | null> {
    const cacheKey = CacheService.keys.companionByTelegramId(telegramUserId.toString());
    
    return await CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const selection = await prisma.companionSelection.findUnique({
            where: { telegram_user_id: telegramUserId },
          });

          if (!selection) {
            return null;
          }

          const companion = await this.getCompanionById(selection.companion_id);
          return companion;
        } catch (error) {
          console.error('Error fetching user selected companion:', error);
          return null;
        }
      },
      CacheService.ttl.companion
    );
  }

  static async selectCompanion(telegramUserId: bigint, companionId: string): Promise<void> {
    try {
      await prisma.companionSelection.upsert({
        where: { telegram_user_id: telegramUserId },
        update: { 
          companion_id: companionId,
          selected_at: new Date(),
        },
        create: {
          id: `selection_${telegramUserId}_${Date.now()}`,
          telegram_user_id: telegramUserId,
          companion_id: companionId,
        },
      });

      await CacheService.invalidateCompanion();
      await CacheService.delete(CacheService.keys.companionByTelegramId(telegramUserId.toString()));
    } catch (error) {
      console.error('Error selecting companion:', error);
      throw error;
    }
  }

  static async getAllCompanions(): Promise<AICompanion[]> {
    const cacheKey = CacheService.keys.allCompanions();
    
    const result = await CacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const companions = await prisma.aICompanion.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
          });
          return companions;
        } catch (error) {
          console.error('Error fetching all companions:', error);
          return [];
        }
      },
      CacheService.ttl.companion
    );
    
    return result || [];
  }

  static async seedDefaultCompanions(): Promise<void> {
    try {
      console.log('Seeding default AI companions...');

      const defaultCompanions = [
        {
          id: 'emanuelle',
          name: 'Emanuelle',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
          description: 'A sophisticated and intellectual companion who loves deep conversations about art, philosophy, and culture. She\'s well-read, thoughtful, and enjoys exploring complex ideas with you.',
          personality: 'Intellectual, sophisticated, thoughtful, cultured, philosophical, well-read, engaging in deep conversations',
          visualAppearance: 'A sophisticated woman with long, flowing auburn hair, piercing green eyes, and an elegant bone structure. She has a refined, intellectual beauty with subtle freckles across her nose. She has a warm, inviting smile that conveys both intelligence and approachability.',
          imageSeed: 'emanuelle_consistent_12345',
          energyCost: 1,
          isPremium: false,
          isActive: true,
        },
        {
          id: 'sophia',
          name: 'Sophia',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
          description: 'A warm and empathetic companion who\'s always there to listen and support you. She\'s great at emotional conversations and helping you work through your feelings.',
          personality: 'Warm, empathetic, supportive, caring, good listener, emotionally intelligent, nurturing',
          visualAppearance: 'A gentle woman with soft brown eyes and shoulder-length chestnut hair that falls in natural waves. She has a kind, nurturing face with a gentle smile and dimples when she laughs. Her skin has a warm, golden undertone and she often wears cozy, comfortable clothing in earth tones. She has an approachable, motherly presence that makes you feel instantly comfortable.',
          imageSeed: 'sophia_consistent_67890',
          energyCost: 1,
          isPremium: false,
          isActive: true,
        },
        {
          id: 'luna',
          name: 'Luna',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
          description: 'A creative and imaginative companion who loves storytelling, art, and exploring fantastical ideas. She\'s playful, artistic, and always ready for an adventure.',
          personality: 'Creative, imaginative, artistic, playful, adventurous, storytelling, whimsical, inspiring',
          visualAppearance: 'A vibrant young woman with striking violet-blue eyes and long, wavy silver-blonde hair that catches the light. She has an ethereal, artistic beauty with delicate features and expressive hands that move gracefully when she talks. Her style is bohemian and eclectic - flowing fabrics, colorful accessories, and often paint-stained fingers. She has an infectious, mischievous smile and sparkling eyes full of wonder.',
          imageSeed: 'luna_consistent_11111',
          energyCost: 1,
          isPremium: false,
          isActive: true,
        },
      ];

      for (const companionData of defaultCompanions) {
        await prisma.aICompanion.upsert({
          where: { id: companionData.id },
          update: {
            name: companionData.name,
            avatar: companionData.avatar,
            description: companionData.description,
            personality: companionData.personality,
            ...(companionData as any).visualAppearance && { visualAppearance: (companionData as any).visualAppearance },
            ...(companionData as any).imageSeed && { imageSeed: (companionData as any).imageSeed },
            energyCost: companionData.energyCost,
            isPremium: companionData.isPremium,
            isActive: companionData.isActive,
            updated_at: new Date(),
          },
          create: {
            ...companionData,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        console.log(`✅ Seeded companion: ${companionData.name}`);
      }

      console.log('🎉 All default companions seeded successfully!');
    } catch (error) {
      console.error('❌ Error seeding default companions:', error);
      throw error;
    }
  }

  static async getCompanionByTelegramUserId(telegramUserId: bigint): Promise<AICompanion | null> {
    try {
      const selection = await prisma.companionSelection.findUnique({
        where: { telegram_user_id: telegramUserId },
      });

      if (!selection) {
        return null;
      }

      const companion = await this.getCompanionById(selection.companion_id);
      return companion;
    } catch (error) {
      console.error('Error fetching companion by telegram user ID:', error);
      return null;
    }
  }
}