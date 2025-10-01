import { prisma } from '@/core/db/prisma';

export interface AICompanion {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: string;
  energyCost: number;
  isPremium: boolean;
  subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ULTIMATE';
  isActive: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CompanionService {
  static async getCompanionById(id: string): Promise<AICompanion | null> {
    try {
      const companion = await prisma.aICompanion.findUnique({
        where: { id },
      });

      return companion;
    } catch (error) {
      console.error('Error fetching companion by ID:', error);
      return null;
    }
  }

  static async getUserSelectedCompanion(telegramUserId: bigint): Promise<AICompanion | null> {
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
    } catch (error) {
      console.error('Error selecting companion:', error);
      throw error;
    }
  }

  static async getAllCompanions(): Promise<AICompanion[]> {
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
          energyCost: 5,
          isPremium: false,
          subscriptionTier: 'FREE' as const,
          isActive: true,
        },
        {
          id: 'sophia',
          name: 'Sophia',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
          description: 'A warm and empathetic companion who\'s always there to listen and support you. She\'s great at emotional conversations and helping you work through your feelings.',
          personality: 'Warm, empathetic, supportive, caring, good listener, emotionally intelligent, nurturing',
          energyCost: 5,
          isPremium: false,
          subscriptionTier: 'FREE' as const,
          isActive: true,
        },
        {
          id: 'luna',
          name: 'Luna',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
          description: 'A creative and imaginative companion who loves storytelling, art, and exploring fantastical ideas. She\'s playful, artistic, and always ready for an adventure.',
          personality: 'Creative, imaginative, artistic, playful, adventurous, storytelling, whimsical, inspiring',
          energyCost: 5,
          isPremium: false,
          subscriptionTier: 'FREE' as const,
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
            energyCost: companionData.energyCost,
            isPremium: companionData.isPremium,
            subscriptionTier: companionData.subscriptionTier,
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