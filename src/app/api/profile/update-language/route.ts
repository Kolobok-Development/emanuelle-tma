import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { locales } from "@/core/i18n/config";


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(request);
    if (!session) {
      globalThis?.logger?.warn({}, 'No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { language } = await request.json();

    if (!language || typeof language !== 'string') {
      globalThis?.logger?.warn({ userId }, 'Invalid language provided');
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    // Validate language
    if (!locales.includes(language as any)) {
      globalThis?.logger?.warn({ userId, language }, 'Invalid language code');
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }

    globalThis?.logger?.info({ userId, language }, 'Updating user language');

    // Update or create user settings
    if (session.user.settings) {
      await prisma.userSettings.update({
        where: { user_id: userId },
        data: { 
          language,
          updated_at: new Date(),
        },
      });
    } else {
      await prisma.userSettings.create({
        data: {
          user_id: userId,
          language,
          updated_at: new Date(),
        },
      });
    }

    globalThis?.logger?.info({ 
      userId,
      language,
      duration: Date.now() - startTime
    }, 'Language updated successfully');

    return NextResponse.json({
      success: true,
      language,
    });
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }, 'Error updating language');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

