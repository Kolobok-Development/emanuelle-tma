import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection, closeBullMQConnection } from '../redis';
import { ImageGenerationService } from '../image-generation';
import { TelegramService } from '../telegram';
import { ImageGenerationJobData, imageGenerationDLQ, imageGenerationQueue } from './image-generation-queue';

console.log('🚀 Starting Image Generation Queue Worker...');

const requiredEnvVars = ['TELEGRAM_BOT_KEY', 'XAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('💡 Please create a .env file with the required variables:');
  console.error('   TELEGRAM_BOT_KEY=your_telegram_bot_token');
  console.error('   XAI_API_KEY=your_xai_api_key');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

const imageGenerationWorker = new Worker(
  'image-generation',
  async (job: Job<ImageGenerationJobData>) => {
    const { chatId, companionName, companionDescription, companionVisualAppearance, companionImageSeed, username, userPrompt } = job.data;
    
    console.log(`Processing image generation job for chat ${chatId}, companion: ${companionName}`);
    
    try {
      await TelegramService.sendChatAction(chatId, 'upload_photo');
      
      console.log('Generating image for companion:', companionName);
      
      const imageResponse = await ImageGenerationService.generateCompanionImage(
        companionName,
        companionDescription,
        companionVisualAppearance,
        companionImageSeed,
        userPrompt
      );

      if (imageResponse.status === 'error') {
        throw new Error(imageResponse.error || 'Image generation failed');
      }

      if (imageResponse.status === 'success' && imageResponse.output && imageResponse.output.length > 0) {
        const imageUrl = imageResponse.output[0];
        
        const caption = `<b>${companionName}</b>\n\n📸 Here's a special image just for you! Hope you like it! 😊`;
        
        const result = await TelegramService.sendPhotoFromUrl(chatId, imageUrl, caption);
        
        if (result && result.ok) {
          console.log(`Image sent successfully for chat ${chatId}`);
          return { success: true, imageUrl };
        } else {
          throw new Error('Failed to send image to Telegram');
        }
      } else {
        throw new Error('No image generated or invalid response');
      }
      
    } catch (error) {
      console.error(`Error processing image generation job for chat ${chatId}:`, error);
      
      const errorMessage = `<b>${companionName}</b>\n\n😔 Sorry, I had trouble creating an image right now. Please try again later!`;
      await TelegramService.sendMessage(chatId, errorMessage);
      
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: parseInt(process.env.IMAGE_WORKER_CONCURRENCY || '1'),
    limiter: {
      max: parseInt(process.env.IMAGE_WORKER_RATE_LIMIT || '3'),
      duration: 60000,
    },
    lockDuration: 120000,
    maxStalledCount: 1,
  }
);

imageGenerationWorker.on('completed', (job) => {
  if (job) {
    console.log(`✅ Image generation job ${job.id} completed successfully`);
  }
});

imageGenerationWorker.on('failed', async (job, err) => {
  if (job) {
    console.error(`❌ Image generation job ${job.id} failed:`, err);
    
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      console.log(`📦 Moving image generation job ${job.id} to dead letter queue after ${job.attemptsMade} attempts`);
      try {
        await imageGenerationDLQ.add(
          'failed-job',
          {
            originalJobId: job.id,
            originalJobData: job.data,
            error: err.message,
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
          },
          {
            removeOnComplete: false,
            removeOnFail: false,
          }
        );
        console.log(`✅ Image generation job ${job.id} moved to DLQ successfully`);
      } catch (dlqError) {
        console.error(`❌ Failed to move image generation job ${job.id} to DLQ:`, dlqError);
      }
    }
  }
});

imageGenerationWorker.on('error', (err) => {
  console.error('❌ Image generation worker error:', err);
});

let isShuttingDown = false;

async function waitForActiveJobs(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const activeJobs = await imageGenerationQueue.getActive();

        if (activeJobs.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      } catch (error) {
        clearInterval(checkInterval);
        reject(error);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn('⚠️  Shutdown timeout - forcing exit');
      reject(new Error('Shutdown timeout exceeded'));
    }, timeout);
  });
}

async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 Shutting down Image Generation Worker gracefully...');

  try {
    await imageGenerationWorker.close();
    console.log('✅ Worker closed, waiting for active jobs to complete...');

    await waitForActiveJobs(30000);
    
    await closeBullMQConnection();
    console.log('✅ Redis connection closed');
    
    console.log('✅ All jobs completed, exiting');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    await closeBullMQConnection();
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  gracefulShutdown();
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await imageGenerationWorker.close();
  await closeBullMQConnection();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await imageGenerationWorker.close();
  await closeBullMQConnection();
  process.exit(1);
});

console.log('✅ Image Generation Queue Worker is running and ready to process jobs!');
console.log(`   - Concurrency: ${process.env.IMAGE_WORKER_CONCURRENCY || '1'}`);
console.log(`   - Rate Limit: ${process.env.IMAGE_WORKER_RATE_LIMIT || '3'} jobs/minute`);
