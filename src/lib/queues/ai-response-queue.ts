import { Queue, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AICompanion } from '@prisma/client';

export interface AIResponseJobData {
  chatId: number;
  userMessage: string;
  companionId: string;
  companionName: string;
  companionPersonality: string;
  companionDescription: string;
  username?: string;
  messageId?: number;
  dbChatId?: string;
  /** Bot token for sendMessage (dedicated bot or hub). */
  botToken?: string;
}

const MAX_JOB_DATA_SIZE = 100 * 1024; 

export const aiResponseQueue = new Queue('ai-response', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 3600 },
    removeOnFail: { count: 50, age: 86400 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const aiResponseDLQ = new Queue('ai-response-dlq', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 200, age: 604800 },
  },
});

function validateJobDataSize(data: AIResponseJobData): void {
  const dataSize = JSON.stringify(data).length;
  if (dataSize > MAX_JOB_DATA_SIZE) {
    throw new Error(`Job data size (${dataSize} bytes) exceeds maximum (${MAX_JOB_DATA_SIZE} bytes)`);
  }
}

function truncateUserMessage(message: string, maxLength: number = 1000): string {
  if (message.length <= maxLength) {
    return message;
  }
  console.warn(`User message truncated from ${message.length} to ${maxLength} characters`);
  return message.substring(0, maxLength) + '...';
}

export async function queueAIResponse(
  chatId: number,
  userMessage: string,
  companion: AICompanion,
  username?: string,
  messageId?: number,
  dbChatId?: string,
  botToken?: string
): Promise<Job<AIResponseJobData>> {
  const truncatedMessage = truncateUserMessage(userMessage);

  const jobData: AIResponseJobData = {
    chatId,
    userMessage: truncatedMessage,
    companionId: companion.id,
    companionName: companion.name,
    companionPersonality: companion.personality,
    companionDescription: companion.description,
    username: username?.substring(0, 100),
    messageId,
    dbChatId,
    botToken,
  };

  validateJobDataSize(jobData);

  const job = await aiResponseQueue.add('generate-response', jobData, {
    priority: 1, 
    delay: 0, 
  });
  
  console.log(`AI response job ${job.id} queued for chat ${chatId}`);
  return job;
}

export async function closeQueue(): Promise<void> {
  await aiResponseQueue.close();
}

