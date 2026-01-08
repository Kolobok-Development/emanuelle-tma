import { redis } from '@/lib/redis';


export const MAX_PAYLOAD_SIZE = 1024 * 1024; 
export const IDEMPOTENCY_TTL = 24 * 60 * 60;
export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_KEY;

export async function isMessageProcessed(chatId: number, messageId: number): Promise<boolean> {
  const key = `webhook:processed:${chatId}:${messageId}`;
  const result = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
  return result === null;
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

