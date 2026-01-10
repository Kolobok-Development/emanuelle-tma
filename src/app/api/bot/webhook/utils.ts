import { redis } from '@/lib/redis';
import { aiResponseQueue } from '@/lib/queues/ai-response-queue';

export const MAX_PAYLOAD_SIZE = 1024 * 1024; 
export const IDEMPOTENCY_TTL = 24 * 60 * 60;
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_KEY;

export async function isMessageProcessed(chatId: number, messageId: number): Promise<boolean> {
  const key = `webhook:processed:${chatId}:${messageId}`;
  const result = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
  return result === null;
}

export async function hasPendingJob(chatId: number): Promise<boolean> {
  try {
    const [waitingJobs, activeJobs] = await Promise.all([
      aiResponseQueue.getJobs(['waiting']),
      aiResponseQueue.getJobs(['active'])
    ]);
    
    const allJobs = [...waitingJobs, ...activeJobs];
    return allJobs.some(job => job.data.chatId === chatId);
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      chatId
    }, 'Error checking for pending jobs');
    return false;
  }
}

export function getPreviousMessageNotProcessedMessage(languageCode?: string): string {
  const lang = languageCode?.toLowerCase() || 'en';
  
  if (lang.startsWith('ru')) {
    return 'Пожалуйста, подождите, пока я обработаю ваше предыдущее сообщение.';
  } else if (lang.startsWith('ar')) {
    return 'يرجى الانتظار حتى أعالج رسالتك السابقة.';
  } else if (lang.startsWith('fr')) {
    return 'Veuillez patienter pendant que je traite votre message précédent.';
  } else if (lang.startsWith('es')) {
    return 'Por favor espera mientras proceso tu mensaje anterior.';
  } else if (lang.startsWith('de')) {
    return 'Bitte warten Sie, während ich Ihre vorherige Nachricht verarbeite.';
  } else {
    return 'Please wait while I process your previous message.';
  }
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) {
    globalThis?.logger?.warn({ chatId }, 'Bot token not configured, cannot send message');
    return;
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      chatId
    }, 'Error sending Telegram message');
  }
}

