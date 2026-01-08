import { prisma } from "@/core/db/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    const startTime = Date.now();
    try{
        globalThis?.logger?.info({}, 'Fetching active companions');

        const companions = await prisma.aICompanion.findMany( {
            where: {
                isActive: true,
            },
        });

        globalThis?.logger?.info({ 
            companionCount: companions.length,
            duration: Date.now() - startTime
        }, 'Companions retrieved successfully');

        return NextResponse.json({
            companions
        });
    }catch(error){
        globalThis?.logger?.error({ 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: Date.now() - startTime
        }, 'Error fetching companions');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
    }
}