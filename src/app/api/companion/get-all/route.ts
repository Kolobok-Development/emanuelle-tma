import { prisma } from "@/core/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/utils/sessions";
import { AppScope } from "@prisma/client";

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    try {
        const session = await getServerSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        globalThis?.logger?.info({}, 'Fetching active companions');

        if (session.app_scope === AppScope.dedicated && session.locked_companion_id) {
            const companion = await prisma.aICompanion.findFirst({
                where: {
                    id: session.locked_companion_id,
                    isActive: true,
                },
            });
            const companions = companion ? [companion] : [];
            globalThis?.logger?.info({
                companionCount: companions.length,
                duration: Date.now() - startTime,
            }, 'Dedicated session: single companion');
            return NextResponse.json({ companions });
        }

        const companions = await prisma.aICompanion.findMany({
            where: {
                isActive: true,
            },
        });

        globalThis?.logger?.info({
            companionCount: companions.length,
            duration: Date.now() - startTime,
        }, 'Companions retrieved successfully');

        return NextResponse.json({
            companions,
        });
    } catch (error) {
        globalThis?.logger?.error({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: Date.now() - startTime,
        }, 'Error fetching companions');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
