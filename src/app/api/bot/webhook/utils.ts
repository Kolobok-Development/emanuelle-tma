import { redis } from '@/lib/redis';
import { aiResponseQueue } from '@/lib/queues/ai-response-queue';

export const MAX_PAYLOAD_SIZE = 1024 * 1024; 
export const IDEMPOTENCY_TTL = 24 * 60 * 60;
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_KEY;
export const RATE_LIMIT_WINDOW = 60; 
export const RATE_LIMIT_MAX_REQUESTS = 10; 

async function checkRedisAvailability(): Promise<void> {
  try {
    const status = redis.status;
    if (status !== 'ready' && status !== 'connect') {
      await redis.ping();
    }
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      redisStatus: redis.status
    }, 'Redis is not available');
    throw new Error('Redis service is unavailable. Please try again later.');
  }
}

export async function isMessageProcessed(chatId: number, messageId: number): Promise<boolean> {
  await checkRedisAvailability();
  
  try {
    const key = `webhook:processed:${chatId}:${messageId}`;
    const result = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
    return result === null;
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      chatId,
      messageId
    }, 'Error checking message processing status');
    throw new Error('Service temporarily unavailable. Please try again later.');
  }
}

export async function checkRateLimit(chatId: number): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  await checkRedisAvailability();
  
  try {
    const key = `rate_limit:${chatId}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    
    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current);
    
    return {
      allowed: current <= RATE_LIMIT_MAX_REQUESTS,
      remaining,
      resetIn: ttl
    };
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      chatId
    }, 'Error checking rate limit');
    throw new Error('Service temporarily unavailable. Please try again later.');
  }
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

export function getRateLimitExceededMessage(languageCode?: string, resetIn?: number): string {
  const lang = languageCode?.toLowerCase() || 'en';
  const resetMinutes = resetIn ? Math.ceil(resetIn / 60) : 1;
  
  if (lang.startsWith('ru')) {
    return `Вы отправляете слишком много сообщений. Пожалуйста, подождите ${resetMinutes} ${resetMinutes === 1 ? 'минуту' : 'минут'}.`;
  } else if (lang.startsWith('ar')) {
    return `أنت ترسل رسائل كثيرة جداً. يرجى الانتظار ${resetMinutes} ${resetMinutes === 1 ? 'دقيقة' : 'دقائق'}.`;
  } else if (lang.startsWith('fr')) {
    return `Vous envoyez trop de messages. Veuillez patienter ${resetMinutes} ${resetMinutes === 1 ? 'minute' : 'minutes'}.`;
  } else if (lang.startsWith('es')) {
    return `Estás enviando demasiados mensajes. Por favor espera ${resetMinutes} ${resetMinutes === 1 ? 'minuto' : 'minutos'}.`;
  } else if (lang.startsWith('de')) {
    return `Sie senden zu viele Nachrichten. Bitte warten Sie ${resetMinutes} ${resetMinutes === 1 ? 'Minute' : 'Minuten'}.`;
  } else {
    return `You're sending too many messages. Please wait ${resetMinutes} ${resetMinutes === 1 ? 'minute' : 'minutes'}.`;
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

