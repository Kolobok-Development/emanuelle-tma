import { prisma } from "@/core/db/prisma";
import { ConversationService } from "@/lib/conversation";
import { queueAIResponse } from "@/lib/queues/ai-response-queue";
import { UserService } from "@/lib/user";
import { CompanionService } from "@/lib/companions";
import { CacheService } from "@/lib/cache";
import { redis } from "@/lib/redis";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";

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
        });
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }
        
        const telegramChatId = Number(user.telegram_id);
        
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
            console.log(`Cleaning up previous chat ${existingActiveChat.id} with companion ${existingActiveChat.companion_id}`);
            
            await ConversationService.deleteChatMessages(existingActiveChat.id);
            
            await ConversationService.deactivateChat(existingActiveChat.id);
            
            try {
                const pattern = `webhook:processed:${telegramChatId}:*`;
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                    console.log(`Cleared ${keys.length} webhook processed cache keys`);
                }
            } catch (error) {
                console.error('Error clearing webhook cache:', error);
            }
            
            await CacheService.delete(CacheService.keys.companionByTelegramId(telegramChatId.toString()));
        }

        let dbChatId: string;
        const existingChatWithCompanion = await ConversationService.getActiveChatByCompanion(userId, companionId);
        
        if (existingChatWithCompanion) {
            dbChatId = existingChatWithCompanion;
            console.log(`Using existing chat ${dbChatId} with companion ${companionId}`);
        } else {
            dbChatId = await ConversationService.createChatWithCompanion(userId, companionId);
            console.log(`Created new chat ${dbChatId} with companion ${companionId}`);
        }

        await CompanionService.selectCompanion(BigInt(telegramChatId), companionId);

        const energyCost = selectedCompanion.energyCost || 5;
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

        const initialMessage = "Hello, how are you?";
        try {
            await ConversationService.saveMessage(dbChatId, 'USER', initialMessage);
        } catch (error) {
            console.error('Error saving initial message:', error);
        }

        await queueAIResponse(
            telegramChatId,
            initialMessage,
            selectedCompanion,
            user.username || undefined,
            undefined,
            dbChatId
        );

        return NextResponse.json({ success: true, chatId: dbChatId });
    } catch (error) {
        console.error('Error initiating chat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}