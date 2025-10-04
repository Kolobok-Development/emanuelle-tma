import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AIService, AIMessage } from '../ai';
import { TelegramService } from '../telegram';
import { ConversationService } from '../conversation';
import { AIResponseJobData } from './ai-response-queue';

console.log('🚀 Starting AI Response Queue Worker...');

// Validate required environment variables
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

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down AI Response Worker...');
  await aiResponseWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down AI Response Worker...');
  await aiResponseWorker.close();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await aiResponseWorker.close();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await aiResponseWorker.close();
  process.exit(1);
});

console.log('✅ AI Response Queue Worker is running and ready to process jobs!');

