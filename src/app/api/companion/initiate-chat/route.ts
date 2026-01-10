import { prisma } from "@/core/db/prisma";
import { ConversationService } from "@/lib/conversation";
import { queueAIResponse } from "@/lib/queues/ai-response-queue";
import { UserService } from "@/lib/user";
import { CompanionService } from "@/lib/companions";
import { CacheService } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitExceededMessage } from "@/app/api/bot/webhook/utils";


function getInitialGreeting(languageCode?: string): string {
  const lang = languageCode?.toLowerCase() || 'en';
  
  if (lang.startsWith('ru')) {
    return 'Привет';
  } else if (lang.startsWith('ar')) {
    return 'مرحبا، كيف حالك؟';
  } else if (lang.startsWith('fr')) {
    return 'Bonjour';
  } else if (lang.startsWith('es')) {
    return 'Hola';
  } else if (lang.startsWith('de')) {
    return 'Hallo';
  } else {
    return 'Hello';
  }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const userId = session.user.id;
        const { companionId } = await request.json();
        
        const user = await prisma.users.findUnique({
            where: { id: userId },
            include: {
                settings: {
                    select: {
                        language: true,
                    },
                },
            },
        });
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }
        
        const telegramChatId = Number(user.telegram_id);
        const userLanguage = user.settings?.language || 'en';
        
        const selectedCompanion = await prisma.aICompanion.findUnique({
            where: { id: companionId },
        });
        if (!selectedCompanion) {
            return NextResponse.json(
                { error: 'Companion not found' },
                { status: 404 }
            );
        }

        const existingActiveChat = await prisma.chat.findFirst({
            where: {
                user_id: userId,
                is_active: true,
            },
            orderBy: { created_at: 'desc' },
        });

        if (existingActiveChat && existingActiveChat.companion_id !== companionId) {
            globalThis?.logger?.info({ 
                previousChatId: existingActiveChat.id,
                previousCompanionId: existingActiveChat.companion_id,
                newCompanionId: companionId
            }, 'Cleaning up previous chat');
            
            await ConversationService.deleteChatMessages(existingActiveChat.id);
            
            await ConversationService.deactivateChat(existingActiveChat.id);
            
            try {
                const pattern = `webhook:processed:${telegramChatId}:*`;
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                    globalThis?.logger?.info({ keyCount: keys.length }, 'Cleared webhook processed cache keys');
                }
            } catch (error) {
                globalThis?.logger?.error({ 
                    error: error instanceof Error ? error.message : String(error)
                }, 'Error clearing webhook cache');
            }
            
            await CacheService.delete(CacheService.keys.companionByTelegramId(telegramChatId.toString()));
        }

        let dbChatId: string;
        const existingChatWithCompanion = await ConversationService.getActiveChatByCompanion(userId, companionId);
        
        if (existingChatWithCompanion) {
            dbChatId = existingChatWithCompanion;
            globalThis?.logger?.info({ chatId: dbChatId, companionId }, 'Using existing chat');
        } else {
            dbChatId = await ConversationService.createChatWithCompanion(userId, companionId);
            globalThis?.logger?.info({ chatId: dbChatId, companionId }, 'Created new chat');
        }

        await CompanionService.selectCompanion(BigInt(telegramChatId), companionId);

        try {
            const rateLimitCheck = await checkRateLimit(telegramChatId);
            if (!rateLimitCheck.allowed) {
                const userLanguage = user.settings?.language || 'en';
                const rateLimitMessage = getRateLimitExceededMessage(userLanguage, rateLimitCheck.resetIn);
                globalThis?.logger?.warn({ 
                    userId,
                    chatId: telegramChatId,
                    remaining: rateLimitCheck.remaining,
                    resetIn: rateLimitCheck.resetIn
                }, 'Rate limit exceeded');
                return NextResponse.json(
                    { 
                        error: 'Rate limit exceeded',
                        message: rateLimitMessage,
                        resetIn: rateLimitCheck.resetIn
                    },
                    { status: 429 }
                );
            }
        } catch (error) {
            globalThis?.logger?.error({ 
                error: error instanceof Error ? error.message : String(error),
                userId,
                chatId: telegramChatId
            }, 'Redis unavailable - blocking request');
            return NextResponse.json(
                { error: 'Service temporarily unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        const energyCost = Math.max(1, selectedCompanion.energyCost || 1);
        const hasEnoughEnergy = await UserService.deductEnergy(userId, energyCost);
        
        if (!hasEnoughEnergy) {
            const currentEnergy = await UserService.getEnergyBalance(userId);
            return NextResponse.json(
                { 
                    error: 'Insufficient energy',
                    required: energyCost,
                    current: currentEnergy 
                },
                { status: 400 }
            );
        }

        const initialMessage = getInitialGreeting(userLanguage);
        try {
            await ConversationService.saveMessage(dbChatId, 'USER', initialMessage);
        } catch (error) {
            globalThis?.logger?.error({ 
                error: error instanceof Error ? error.message : String(error),
                chatId: dbChatId
            }, 'Error saving initial message');
        }

        await queueAIResponse(
            telegramChatId,
            initialMessage,
            selectedCompanion,
            user.username || undefined,
            undefined,
            dbChatId
        );

        globalThis?.logger?.info({ 
            userId,
            companionId,
            chatId: dbChatId
        }, 'Chat initiated successfully');

        return NextResponse.json({ success: true, chatId: dbChatId });
    } catch (error) {
        globalThis?.logger?.error({ 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, 'Error initiating chat');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}