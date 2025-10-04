import { Queue, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
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
  await aiResponseQueue.close();
}

