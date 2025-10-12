import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { ImageGenerationService } from '../image-generation';
import { TelegramService } from '../telegram';
import { ImageGenerationJobData } from './image-generation-queue';

console.log('🚀 Starting Image Generation Queue Worker...');

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_KEY', 'MODELSLAB_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('💡 Please create a .env file with the required variables:');
  console.error('   TELEGRAM_BOT_KEY=your_telegram_bot_token');
  console.error('   MODELSLAB_KEY=your_modelslab_api_key');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

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
        userPrompt
      );

      if (imageResponse.status === 'error') {
        throw new Error(imageResponse.error || 'Image generation failed');
      }

      if (imageResponse.status === 'processing') {
        console.log('Image generation is processing, ETA:', imageResponse.eta);
        
        const processingMessage = `${companion.name}</b>\n\n🎨 Creating a beautiful image for you... This might take a moment!`;
        await TelegramService.sendMessage(chatId, processingMessage);
        
        if (imageResponse.fetch_result) {
          console.log('Polling for image completion using fetch URL:', imageResponse.fetch_result);
          
          const polledResponse = await ImageGenerationService.pollForImageCompletion(
            imageResponse.fetch_result
          );
          
          if (polledResponse.status === 'success' && polledResponse.output && polledResponse.output.length > 0) {
            const imageUrl = polledResponse.output[0];
            
            const caption = `${companion.name}</b>\n\n📸 Here's a special image just for you! Hope you like it! 😊`;
            
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
        
        const caption = `${companion.name}</b>\n\n📸 Here's a special image just for you! Hope you like it! 😊`;
        
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
      
      const errorMessage = `${companion.name}</b>\n\n😔 Sorry, I had trouble creating an image right now. Please try again later!`;
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
  console.log('🛑 Shutting down Image Generation Worker...');
  await imageGenerationWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Image Generation Worker...');
  await imageGenerationWorker.close();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await imageGenerationWorker.close();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await imageGenerationWorker.close();
  process.exit(1);
});

console.log('✅ Image Generation Queue Worker is running and ready to process jobs!');
