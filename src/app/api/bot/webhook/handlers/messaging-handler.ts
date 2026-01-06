import { NextResponse } from 'next/server';
import { queueAIResponse } from '@/lib/queues/ai-response-queue';
import { CompanionService } from '@/lib/companions';
import { ConversationService } from '@/lib/conversation';
import { TelegramService } from '@/lib/telegram';
import { UserService } from '@/lib/user';
import { isMessageProcessed } from '../utils';

export async function handleMessagingWebhook(update: any): Promise<NextResponse> {
  if (update.message && update.message.text) {
    const { chat, from, text } = update.message;

    if (update.message.successful_payment || text === '/paysupport') {
      return NextResponse.json({ ok: true });
    }

    if (update.message.message_id) {
      const alreadyProcessed = await isMessageProcessed(chat.id, update.message.message_id);
      if (alreadyProcessed) {
        console.log(`Message ${update.message.message_id} from chat ${chat.id} already processed, skipping`);
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
    
    const energyCost = selectedCompanion.energyCost || 5;
    const hasEnoughEnergy = await UserService.deductEnergy(userId, energyCost);
    
    if (!hasEnoughEnergy) {
      const currentEnergy = await UserService.getEnergyBalance(userId);
      const insufficientBalanceMessage = 
        `You don't have enough energy to generate a response.\n\n` +
        `Required: ${energyCost} \n` +
        `Your balance: ${currentEnergy} \n\n` +
        `Please purchase more energy to continue chatting.`;
      
      await TelegramService.sendMessage(chat.id, insufficientBalanceMessage);
      console.log(`Insufficient balance for user ${from.id}: has ${currentEnergy}, needs ${energyCost}`);
      return NextResponse.json({ ok: true });
    }
    
    await queueAIResponse(
      chat.id,
      text,
      selectedCompanion,
      from.username || from.first_name || 'User',
      update.message.message_id,
      dbChatId
    );

    console.log(`Queued message from ${from.username || from.first_name} to ${selectedCompanion.name}: ${text}`);
  }

  return NextResponse.json({ ok: true });
}

