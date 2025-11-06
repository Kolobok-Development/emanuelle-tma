import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { queueAIResponse } from '@/lib/queues/ai-response-queue';
import { queueImageGeneration } from '@/lib/queues/image-generation-queue';
import { CompanionService } from '@/lib/companions';
import { ConversationService } from '@/lib/conversation';
import { TelegramService } from '@/lib/telegram';
import { UserService } from '@/lib/user';
import { redis } from '@/lib/redis';

const MAX_PAYLOAD_SIZE = 1024 * 1024; 
const IDEMPOTENCY_TTL = 24 * 60 * 60; 

function validateWebhookAuth(request: NextRequest): boolean {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  
  if (!secretToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: TELEGRAM_WEBHOOK_SECRET_TOKEN not set in production!');
      return false;
    }
    console.warn('⚠️  Development mode: Webhook secret token validation skipped');
    return true;
  }

  const headerToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  
  if (!headerToken) {
    console.warn('Missing X-Telegram-Bot-Api-Secret-Token header');
    return false;
  }

  if (headerToken.length !== secretToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(secretToken)
    );
  } catch {
    return false;
  }
}

async function isMessageProcessed(chatId: number, messageId: number): Promise<boolean> {
  const key = `webhook:processed:${chatId}:${messageId}`;
  const result = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
  return result === null;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateWebhookAuth(request)) {
      console.error('Webhook authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      console.error(`Payload too large: ${rawBody.length} bytes (max: ${MAX_PAYLOAD_SIZE})`);
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Invalid JSON payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('Received webhook:', JSON.stringify(body, null, 2));

    if (body.message && body.message.text) {
      const { chat, from, text } = body.message;

      if (body.message.message_id) {
        const alreadyProcessed = await isMessageProcessed(chat.id, body.message.message_id);
        if (alreadyProcessed) {
          console.log(`Message ${body.message.message_id} from chat ${chat.id} already processed, skipping`);
          return NextResponse.json({ ok: true });
        }
      }

      const userId = await UserService.getOrCreateUserByTelegramId(
        BigInt(from.id),
        from.username || from.first_name || undefined
      );

      let selectedCompanion = await CompanionService.getUserSelectedCompanion(BigInt(from.id));
      
      if (!selectedCompanion) {
        const companions = await CompanionService.getAllCompanions();
        if (companions.length > 0) {
          const firstCompanion = companions[0];
          await CompanionService.selectCompanion(BigInt(from.id), firstCompanion.id);
          selectedCompanion = firstCompanion;
          console.log(`Auto-selected companion ${firstCompanion.name} for user ${from.id}`);
        } else {
          await TelegramService.sendMessage(
            chat.id, 
            "👋 Welcome! No companions are currently available. Please try again later."
          );
          return NextResponse.json({ ok: true });
        }
      }

      let dbChatId: string;
      try {
        dbChatId = await ConversationService.getOrCreateActiveChat(userId);
      } catch (error) {
        console.error('Error getting/creating chat:', error);
        dbChatId = chat.id.toString();
      }

      try {
        await ConversationService.saveMessage(dbChatId, 'USER', text);
      } catch (error) {
        console.error('Error saving user message:', error);
      }
      
      await queueAIResponse(
        chat.id,
        text,
        selectedCompanion,
        from.username || from.first_name || 'User',
        body.message.message_id,
        dbChatId
      );

      console.log(`Queued message from ${from.username || from.first_name} to ${selectedCompanion.name}: ${text}`);
    }

    if (body.callback_query) {
      const { callback_query } = body;
      const { data, message, from: callbackFrom, id: callbackId } = callback_query;

      if (callbackId) {
        const callbackKey = `webhook:callback:${callbackId}`;
        const result = await redis.set(callbackKey, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
        
        if (result === null) {
          console.log(`Callback query ${callbackId} already processed, skipping`);
          await TelegramService.answerCallbackQuery(callbackId);
          return NextResponse.json({ ok: true });
        }
      }

      console.log(`Received callback query: ${data} from user ${callbackFrom.id}`);

      if (data === 'request_photo') {
        const selectedCompanion = await CompanionService.getUserSelectedCompanion(BigInt(callbackFrom.id));
        
        if (selectedCompanion) {
          await queueImageGeneration(
            message.chat.id,
            selectedCompanion,
            callbackFrom.username || callbackFrom.first_name || 'User',
            undefined, 
            message.message_id
          );
        }

        await TelegramService.answerCallbackQuery(callback_query.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
