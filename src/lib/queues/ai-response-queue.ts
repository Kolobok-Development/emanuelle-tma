import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AIService, AIMessage } from '../ai';
import { TelegramService } from '../telegram';
import { ConversationService } from '../conversation';
import { AICompanion } from '@prisma/client';

export interface AIResponseJobData {
  chatId: number;
  userMessage: string;
  companion: AICompanion;
  username?: string;
  messageId?: number;
  dbChatId?: string;
}

export const aiResponseQueue = new Queue('ai-response', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const aiResponseWorker = new Worker(
  'ai-response',
  async (job: Job<AIResponseJobData>) => {
    const { chatId, userMessage, companion, username, dbChatId } = job.data;
    
    console.log(`Processing AI response job for chat ${chatId}, companion: ${companion.name}`);
    
    try {
      let conversationHistory: AIMessage[] = [];
      
      if (dbChatId) {
        try {
          conversationHistory = await ConversationService.getFormattedConversationHistory(dbChatId, 15);
        } catch (contextError) {
          console.error('Failed to retrieve conversation context:', contextError);
          conversationHistory = [];
        }
      }

      console.log('Generating AI response for:', companion.name, 'with context length:', conversationHistory.length);
      
      const aiResponse = await AIService.generateCompanionResponse(
        conversationHistory,
        companion.name,
        companion.personality,
        companion.description,
        username
      );

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      if (dbChatId && aiResponse.message) {
        try {
          await ConversationService.saveMessage(dbChatId, 'ASSISTANT', aiResponse.message, aiResponse.tokens_used);
        } catch (saveError) {
          console.error('Failed to save AI response to conversation history:', saveError);
        }
      }

      await TelegramService.sendMessage(chatId, aiResponse.message || "");
      
      console.log(`AI response sent successfully for chat ${chatId}`);
      
      return { success: true, response: aiResponse.message };
      
    } catch (error) {
      console.error(`Error processing AI response job for chat ${chatId}:`, error);
      
      const errorMessage = `${companion.avatar} <b>${companion.name}</b>\n\nSorry, I'm having trouble thinking right now. Please try again in a moment!`;
      await TelegramService.sendMessage(chatId, errorMessage);
      
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000, 
    },
  }
);

aiResponseWorker.on('completed', (job) => {
  if (job) {
    console.log(`AI response job ${job.id} completed successfully`);
  }
});

aiResponseWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`AI response job ${job.id} failed:`, err);
  }
});

aiResponseWorker.on('error', (err) => {
  console.error('AI response worker error:', err);
});

export async function queueAIResponse(
  chatId: number, 
  userMessage: string, 
  companion: AICompanion, 
  username?: string, 
  messageId?: number, 
  dbChatId?: string
): Promise<Job<AIResponseJobData>> {
  const job = await aiResponseQueue.add('generate-response', {
    chatId,
    userMessage,
    companion,
    username,
    messageId,
    dbChatId,
  }, {
    priority: 1, 
    delay: 0, 
  });
  
  console.log(`AI response job ${job.id} queued for chat ${chatId}`);
  return job;
}

export async function closeQueue(): Promise<void> {
  await aiResponseWorker.close();
  await aiResponseQueue.close();
}

