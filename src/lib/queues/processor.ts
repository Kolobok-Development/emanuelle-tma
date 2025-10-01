import { aiResponseWorker } from './ai-response-queue';

console.log('🚀 Starting AI Response Queue Worker...');

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

