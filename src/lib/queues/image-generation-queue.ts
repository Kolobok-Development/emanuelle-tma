import { Queue, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AICompanion } from '@prisma/client';

export interface ImageGenerationJobData {
  chatId: number;
  companionId: string;
  companionName: string;
  companionDescription: string;
  companionVisualAppearance?: string;
  companionImageSeed?: string;
  username?: string;
  userPrompt?: string;
  messageId?: number;
}

const MAX_JOB_DATA_SIZE = 50 * 1024; 

function validateJobDataSize(data: ImageGenerationJobData): void {
  const dataSize = JSON.stringify(data).length;
  if (dataSize > MAX_JOB_DATA_SIZE) {
    throw new Error(`Job data size (${dataSize} bytes) exceeds maximum (${MAX_JOB_DATA_SIZE} bytes)`);
  }
}

function truncatePrompt(prompt: string | undefined, maxLength: number = 500): string | undefined {
  if (!prompt) return undefined;
  if (prompt.length <= maxLength) return prompt;
  console.warn(`User prompt truncated from ${prompt.length} to ${maxLength} characters`);
  return prompt.substring(0, maxLength) + '...';
}

export const imageGenerationQueue = new Queue('image-generation', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 50, age: 3600 },
    removeOnFail: { count: 30, age: 86400 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const imageGenerationDLQ = new Queue('image-generation-dlq', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 50, age: 86400 },
    removeOnFail: { count: 100, age: 604800 },
  },
});

export async function queueImageGeneration(
  chatId: number, 
  companion: AICompanion, 
  username?: string, 
  userPrompt?: string,
  messageId?: number
): Promise<Job<ImageGenerationJobData>> {
  const jobData: ImageGenerationJobData = {
    chatId,
    companionId: companion.id,
    companionName: companion.name,
    companionDescription: companion.description,
    companionVisualAppearance: (companion as any).visualAppearance?.substring(0, 1000),
    companionImageSeed: (companion as any).imageSeed,
    username: username?.substring(0, 100),
    userPrompt: truncatePrompt(userPrompt),
    messageId,
  };

  validateJobDataSize(jobData);

  const job = await imageGenerationQueue.add('generate-image', jobData, {
    priority: 2,
    delay: 0, 
  });
  
  console.log(`Image generation job ${job.id} queued for chat ${chatId}`);
  return job;
}

export async function closeImageGenerationQueue(): Promise<void> {
  await imageGenerationQueue.close();
}
