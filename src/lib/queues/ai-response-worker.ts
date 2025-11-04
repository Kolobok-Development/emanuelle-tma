import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection, closeBullMQConnection } from '../redis';
import { AIService, AIMessage } from '../ai';
import { TelegramService, InlineKeyboardMarkup } from '../telegram';
import { ConversationService } from '../conversation';
import { AIResponseJobData, aiResponseDLQ, aiResponseQueue } from './ai-response-queue';

console.log('🚀 Starting AI Response Queue Worker...');

const requiredEnvVars = ['TELEGRAM_BOT_KEY', 'MODELSLAB_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('💡 Please create a .env file with the required variables:');
  console.error('   TELEGRAM_BOT_KEY=your_telegram_bot_token');
  console.error('   MODELSLAB_KEY=your_modelslab_api_key');
  console.error('   DATABASE_URL=your_postgresql_connection_string');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

const aiResponseWorker = new Worker(
  'ai-response',
  async (job: Job<AIResponseJobData>) => {
    const { chatId, companion, username, dbChatId } = job.data;
    
    console.log(`Processing AI response job for chat ${chatId}, companion: ${companion.name}`);
    
    try {
      let conversationHistory: AIMessage[] = [];
      
      if (dbChatId) {
        try {
          conversationHistory = await ConversationService.getTokenAwareConversationHistory(dbChatId);
        } catch (contextError) {
          console.error('Failed to retrieve conversation context:', contextError);
          conversationHistory = [];
        }
      }

      console.log('Generating AI response for:', companion.name, 'with context length:', conversationHistory.length);
      
      await TelegramService.sendChatAction(chatId, 'typing');
      
      const aiResponse = await AIService.generateCompanionResponse(
        conversationHistory,
        companion.name,
        companion.personality,
        "",
        username
      );

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      if (!aiResponse.message || aiResponse.message.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

      const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
      let responseMessage = aiResponse.message;

      if (responseMessage.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
        console.warn(`Response message too long (${responseMessage.length} chars), truncating to ${TELEGRAM_MAX_MESSAGE_LENGTH}`);
        responseMessage = responseMessage.substring(0, TELEGRAM_MAX_MESSAGE_LENGTH - 10) + '...';
      }

      responseMessage = responseMessage
        .replace(/<script[^>]*>.*?<\/script>/gi, '') 
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');

      if (dbChatId && responseMessage) {
        try {
          await ConversationService.saveMessage(dbChatId, 'ASSISTANT', responseMessage, aiResponse.tokens_used);
        } catch (saveError) {
          console.error('Failed to save AI response to conversation history:', saveError);
        }
      }

      const actionButton: InlineKeyboardMarkup = {
        inline_keyboard: [[
          {
            text: "📸 пришли фотографию",
            callback_data: "request_photo"
          }
        ]]
      };

      await TelegramService.sendMessage(chatId, responseMessage, 'HTML', actionButton);
      
      console.log(`AI response sent successfully for chat ${chatId}`);
      
      return { success: true, response: responseMessage };
      
    } catch (error) {
      console.error(`Error processing AI response job for chat ${chatId}:`, error);
      
      const errorMessage = `<b>${companion.name}</b>\n\nSorry, I'm having trouble thinking right now. Please try again in a moment!`;
      await TelegramService.sendMessage(chatId, errorMessage);
      
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY || '2'),
    limiter: {
      max: parseInt(process.env.AI_WORKER_RATE_LIMIT || '5'),
      duration: 60000, 
    },
    lockDuration: 30000,
    maxStalledCount: 1,
  }
);

aiResponseWorker.on('completed', (job) => {
  if (job) {
    console.log(`✅ AI response job ${job.id} completed successfully`);
  }
});

aiResponseWorker.on('failed', async (job, err) => {
  if (job) {
    console.error(`❌ AI response job ${job.id} failed:`, err);
    
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      console.log(`📦 Moving job ${job.id} to dead letter queue after ${job.attemptsMade} attempts`);
      try {
        await aiResponseDLQ.add(
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
        console.log(`✅ Job ${job.id} moved to DLQ successfully`);
      } catch (dlqError) {
        console.error(`❌ Failed to move job ${job.id} to DLQ:`, dlqError);
      }
    }
  }
});

aiResponseWorker.on('error', (err) => {
  console.error('❌ AI response worker error:', err);
});

let isShuttingDown = false;

async function waitForActiveJobs(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const activeJobs = await aiResponseQueue.getActive();

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

  console.log('🛑 Shutting down AI Response Worker gracefully...');

  try {
    await aiResponseWorker.close();
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
  await aiResponseWorker.close();
  await closeBullMQConnection();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await aiResponseWorker.close();
  await closeBullMQConnection();
  process.exit(1);
});

console.log('✅ AI Response Queue Worker is running and ready to process jobs!');
console.log(`   - Concurrency: ${process.env.AI_WORKER_CONCURRENCY || '2'}`);
console.log(`   - Rate Limit: ${process.env.AI_WORKER_RATE_LIMIT || '5'} jobs/minute`);

