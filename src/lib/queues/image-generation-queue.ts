import { Queue, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AICompanion } from '@prisma/client';

export interface ImageGenerationJobData {
  chatId: number;
  companion: AICompanion;
  username?: string;
  userPrompt?: string;
  messageId?: number;
}

export const imageGenerationQueue = new Queue('image-generation', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export async function queueImageGeneration(
  chatId: number, 
  companion: AICompanion, 
  username?: string, 
  userPrompt?: string,
  messageId?: number
): Promise<Job<ImageGenerationJobData>> {
  const job = await imageGenerationQueue.add('generate-image', {
    chatId,
    companion,
    username,
    userPrompt,
    messageId,
  }, {
    priority: 2,
    delay: 0, 
  });
  
  console.log(`Image generation job ${job.id} queued for chat ${chatId}`);
  return job;
}

export async function closeImageGenerationQueue(): Promise<void> {
  await imageGenerationQueue.close();
}
