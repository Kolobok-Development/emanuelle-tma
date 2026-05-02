import { prisma } from "@/core/db/prisma";
import { COOKIE_NAME, decrypt } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) { 
    const startTime = Date.now();
    try {
        const token = request.cookies.get(COOKIE_NAME)?.value;

        if (!token) {
            globalThis?.logger?.warn({}, 'No session token found');
            return NextResponse.json(
              { error: 'No session found' },
              { status: 401 }
            );
        }

        // Verify JWT and check if session exists in database
        try {
            await decrypt(token);
        } catch (error) {
            globalThis?.logger?.warn({ error: error instanceof Error ? error.message : String(error) }, 'Invalid session token');
            return NextResponse.json(
            { error: 'Invalid session token' },
            { status: 401 }
            );
        }

        const session = await prisma.session.findFirstOrThrow({
            where: { token },
            include: { user: { include: { settings: true } } }
        });

        if (!session || session.expires_at < new Date()) {
            globalThis?.logger?.warn({ sessionId: session?.id, expired: session?.expires_at }, 'Session expired or not found');
            return NextResponse.json(
              { error: 'Session expired or not found' },
              { status: 401 }
            );
        }

        globalThis?.logger?.info({ 
            userId: session.user.id,
            duration: Date.now() - startTime
        }, 'User data retrieved successfully');

        return NextResponse.json({
            success: true,
            user: {
              id: session.user.id,
              telegram_id: Number(session.user.telegram_id),
              username: session.user.username,
              settings: session.user.settings,
              diamonds: session.user.diamonds,
              energy: session.user.energy,
              gender: session.user.gender,
              onboarding_completed_at: session.user.onboarding_completed_at?.toISOString() ?? null,
            },
            session: {
              expires_at: session.expires_at,
              app_scope: session.app_scope,
              locked_companion_id: session.locked_companion_id,
            }
          });

    }catch (error) {
        globalThis?.logger?.error({ 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: Date.now() - startTime
        }, 'Error retrieving user data');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
    }
}