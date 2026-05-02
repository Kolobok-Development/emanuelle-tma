import { NextResponse } from 'next/server';
import { queueAIResponse } from '@/lib/queues/ai-response-queue';
import { CompanionService } from '@/lib/companions';
import { ConversationService } from '@/lib/conversation';
import { TelegramService } from '@/lib/telegram';
import { UserService } from '@/lib/user';
import { isMessageProcessed } from '../utils';
import type { WebhookTenantContext } from '@/lib/telegram-tenant';

export async function handleMessagingWebhook(
  update: any,
  tenant: WebhookTenantContext
): Promise<NextResponse> {
  const botToken = tenant.botToken;

  if (update.message && update.message.text) {
    const { chat, from, text } = update.message;

    if (update.message.successful_payment || text === '/paysupport') {
      return NextResponse.json({ ok: true });
    }

    if (update.message.message_id) {
      const alreadyProcessed = await isMessageProcessed(chat.id, update.message.message_id);
      if (alreadyProcessed) {
        globalThis?.logger?.debug(
          {
            messageId: update.message.message_id,
            chatId: chat.id,
          },
          'Message already processed, skipping'
        );
        return NextResponse.json({ ok: true });
      }
    }

    const userId = await UserService.getOrCreateUserByTelegramId(
      BigInt(from.id),
      from.username || from.first_name || undefined
    );

    let selectedCompanion = null as Awaited<ReturnType<typeof CompanionService.getCompanionById>>;

    if (tenant.companionId) {
      selectedCompanion = await CompanionService.getCompanionById(tenant.companionId);
      if (selectedCompanion) {
        await CompanionService.selectCompanion(BigInt(from.id), selectedCompanion.id);
      }
    } else {
      selectedCompanion = await CompanionService.getUserSelectedCompanion(BigInt(from.id));

      if (!selectedCompanion) {
        const companions = await CompanionService.getAllCompanions();
        if (companions.length > 0) {
          const firstCompanion = companions[0];
          await CompanionService.selectCompanion(BigInt(from.id), firstCompanion.id);
          selectedCompanion = firstCompanion;
          globalThis?.logger?.info(
            {
              userId: from.id,
              companionId: firstCompanion.id,
              companionName: firstCompanion.name,
            },
            'Auto-selected companion for user'
          );
        } else {
          await TelegramService.sendMessage(
            chat.id,
            '👋 Welcome! No companions are currently available. Please try again later.',
            'HTML',
            undefined,
            botToken
          );
          return NextResponse.json({ ok: true });
        }
      }
    }

    if (!selectedCompanion) {
      await TelegramService.sendMessage(
        chat.id,
        '👋 Welcome! This companion is unavailable. Please try again later.',
        'HTML',
        undefined,
        botToken
      );
      return NextResponse.json({ ok: true });
    }

    let dbChatId: string;
    try {
      if (tenant.companionId) {
        dbChatId = await ConversationService.getOrCreateActiveChatForCompanion(userId, tenant.companionId);
      } else {
        dbChatId = await ConversationService.getOrCreateActiveChat(userId);
      }
    } catch (error) {
      globalThis?.logger?.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        'Error getting/creating chat'
      );
      dbChatId = chat.id.toString();
    }

    try {
      await ConversationService.saveMessage(dbChatId, 'USER', text);
    } catch (error) {
      globalThis?.logger?.error(
        {
          error: error instanceof Error ? error.message : String(error),
          chatId: dbChatId,
        },
        'Error saving user message'
      );
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

      await TelegramService.sendMessage(chat.id, insufficientBalanceMessage, 'HTML', undefined, botToken);
      globalThis?.logger?.warn(
        {
          userId: from.id,
          currentEnergy,
          requiredEnergy: energyCost,
        },
        'Insufficient balance for user'
      );
      return NextResponse.json({ ok: true });
    }

    await queueAIResponse(
      chat.id,
      text,
      selectedCompanion,
      from.username || from.first_name || 'User',
      update.message.message_id,
      dbChatId,
      botToken
    );

    globalThis?.logger?.info(
      {
        userId: from.id,
        username: from.username || from.first_name,
        companionName: selectedCompanion.name,
        messageLength: text.length,
      },
      'Queued message for AI response'
    );
  }

  return NextResponse.json({ ok: true });
}
