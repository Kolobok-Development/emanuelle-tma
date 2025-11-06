import { prisma } from "@/core/db/prisma";
import { ConversationService } from "@/lib/conversation";
import { queueAIResponse } from "@/lib/queues/ai-response-queue";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {
    try{
        const session = await getServerSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
        const userId = session.user.id;
        const { companionId } = await request.json();
        
        const dbChatId = await ConversationService.getOrCreateActiveChat(userId);

        console.log('dbChatId: ', dbChatId);

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
        })
        if (!selectedCompanion) {
            return NextResponse.json(
                { error: 'Companion not found' },
                { status: 404 }
            );
        }

        await queueAIResponse(
            telegramChatId,
            "Hello, how are you?",
            selectedCompanion,
            user.username || undefined,
            undefined,
            dbChatId
          );

        return NextResponse.json(true)
    }catch(error){
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
    }
}