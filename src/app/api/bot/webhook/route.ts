import { NextRequest, NextResponse } from 'next/server';
import { queueAIResponse } from '@/lib/queues/ai-response-queue';
import { CompanionService } from '@/lib/companions';
import { ConversationService } from '@/lib/conversation';
import { TelegramService } from '@/lib/telegram';
import { UserService } from '@/lib/user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    if (body.message && body.message.text) {
      const { chat, from, text } = body.message;

      
      const userId = await UserService.getOrCreateUserByTelegramId(
        BigInt(from.id),
        from.username || from.first_name || undefined
      );

      const selectedCompanion = await CompanionService.getUserSelectedCompanion(BigInt(from.id));
      
      if (!selectedCompanion) {
        await TelegramService.sendMessage(
          chat.id, 
          "👋 Welcome! Please select a companion first by visiting our bot settings or using the /select command."
        );
        return NextResponse.json({ ok: true });
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
