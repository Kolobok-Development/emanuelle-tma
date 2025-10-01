import { prisma } from '@/core/db/prisma';
import { AIMessage } from './ai';

export class ConversationService {
  static async getFormattedConversationHistory(
    chatId: string, 
    limit: number = 15
  ): Promise<AIMessage[]> {
    try {
      const messages = await prisma.message.findMany({
        where: { chat_id: chatId },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          role: true,
          content: true,
        },
      });

      return messages.reverse().map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  static async saveMessage(
    chatId: string,
    role: 'USER' | 'ASSISTANT' | 'SYSTEM',
    content: string,
    tokensUsed?: number
  ): Promise<void> {
    try {
      await prisma.message.create({
        data: {
          chat_id: chatId,
          role: role,
          content: content,
          tokens_used: tokensUsed,
        },
      });
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  static async createChat(userId: string, title?: string): Promise<string> {
    try {
      const chat = await prisma.chat.create({
        data: {
          user_id: userId,
          title: title,
        },
      });
      return chat.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  static async getOrCreateActiveChat(userId: string): Promise<string> {
    try {
      let chat = await prisma.chat.findFirst({
        where: {
          user_id: userId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
      });

      if (!chat) {
        // Create a new active chat if none exists
        chat = await prisma.chat.create({
          data: {
            user_id: userId,
            is_active: true,
          },
        });
      }

      return chat.id;
    } catch (error) {
      console.error('Error getting or creating active chat:', error);
      throw error;
    }
  }

  static async deactivateChat(chatId: string): Promise<void> {
    try {
      await prisma.chat.update({
        where: { id: chatId },
        data: { is_active: false },
      });
    } catch (error) {
      console.error('Error deactivating chat:', error);
      throw error;
    }
  }
}
