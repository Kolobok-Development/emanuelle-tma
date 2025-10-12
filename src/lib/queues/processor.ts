import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { AIService, AIMessage } from '../ai';
import { ImageGenerationService } from '../image-generation';
import { TelegramService, InlineKeyboardMarkup } from '../telegram';
import { ConversationService } from '../conversation';
import { AIResponseJobData } from './ai-response-queue';
import { ImageGenerationJobData } from './image-generation-queue';

console.log('🚀 Starting Combined Queue Workers (AI Response + Image Generation)...');

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
      
      await TelegramService.sendChatAction(chatId, 'typing');
      
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

      const actionButton: InlineKeyboardMarkup = {
        inline_keyboard: [[
          {
            text: "📸 пришли фотографию",
            callback_data: "request_photo"
          }
        ]]
      };

      await TelegramService.sendMessage(chatId, aiResponse.message || "", 'HTML', actionButton);
      
      console.log(`AI response sent successfully for chat ${chatId}`);
      
      return { success: true, response: aiResponse.message };
      
    } catch (error) {
      console.error(`Error processing AI response job for chat ${chatId}:`, error);
      
      const errorMessage = `${companion.name}</b>\n\nSorry, I'm having trouble thinking right now. Please try again in a moment!`;
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

const imageGenerationWorker = new Worker(
  'image-generation',
  async (job: Job<ImageGenerationJobData>) => {
    const { chatId, companion, username, userPrompt } = job.data;
    
    console.log(`Processing image generation job for chat ${chatId}, companion: ${companion.name}`);
    
    try {
      await TelegramService.sendChatAction(chatId, 'upload_photo');
      
      console.log('Generating image for companion:', companion.name);
      
      const imageResponse = await ImageGenerationService.generateCompanionImage(
        companion.name,
        companion.description,
        (companion as any).visualAppearance,
        (companion as any).imageSeed,
        userPrompt
      );

      if (imageResponse.status === 'error') {
        throw new Error(imageResponse.error || 'Image generation failed');
      }

      if (imageResponse.status === 'processing') {
        console.log('Image generation is processing, ETA:', imageResponse.eta);
        
        const processingMessage = `<b>${companion.name}</b>\n\n🎨 Creating a beautiful image for you... This might take a moment!`;
        await TelegramService.sendMessage(chatId, processingMessage);
        
        if (imageResponse.fetch_result) {
          console.log('Polling for image completion using fetch URL:', imageResponse.fetch_result);
          
          const polledResponse = await ImageGenerationService.pollForImageCompletion(
            imageResponse.fetch_result
          );
          
          if (polledResponse.status === 'success' && polledResponse.output && polledResponse.output.length > 0) {
            const imageUrl = polledResponse.output[0];
            
            const caption = `<b>${companion.name}</b>\n\n📸 Here's a special image just for you! Hope you like it! 😊`;
            
            const result = await TelegramService.sendPhotoFromUrl(chatId, imageUrl, caption);
            
            if (result && result.ok) {
              console.log(`Image sent successfully for chat ${chatId} after polling`);
              return { success: true, imageUrl };
            } else {
              throw new Error('Failed to send image to Telegram after polling');
            }
          } else {
            throw new Error(`Image generation failed after polling: ${polledResponse.error || 'Unknown error'}`);
          }
        } else {
          throw new Error('No fetch URL provided for polling');
        }
      }

      if (imageResponse.status === 'success' && imageResponse.output && imageResponse.output.length > 0) {
        const imageUrl = imageResponse.output[0];
        
        const caption = `<b>${companion.name}</b>\n\n📸 Here's a special image just for you! Hope you like it! 😊`;
        
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
      
      const errorMessage = `<b>${companion.name}</b>\n\n😔 Sorry, I had trouble creating an image right now. Please try again later!`;
      await TelegramService.sendMessage(chatId, errorMessage);
      
      throw error;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 1, 
    limiter: {
      max: 3,
      duration: 60000,
    },
  }
);

imageGenerationWorker.on('completed', (job) => {
  if (job) {
    console.log(`Image generation job ${job.id} completed successfully`);
  }
});

imageGenerationWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`Image generation job ${job.id} failed:`, err);
  }
});

imageGenerationWorker.on('error', (err) => {
  console.error('Image generation worker error:', err);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Combined Queue Workers...');
  await Promise.all([
    aiResponseWorker.close(),
    imageGenerationWorker.close()
  ]);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Combined Queue Workers...');
  await Promise.all([
    aiResponseWorker.close(),
    imageGenerationWorker.close()
  ]);
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await Promise.all([
    aiResponseWorker.close(),
    imageGenerationWorker.close()
  ]);
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await Promise.all([
    aiResponseWorker.close(),
    imageGenerationWorker.close()
  ]);
  process.exit(1);
});

console.log('✅ Combined Queue Workers are running and ready to process jobs!');
console.log('   - AI Response Worker: processing text responses');
console.log('   - Image Generation Worker: processing image generation requests');

