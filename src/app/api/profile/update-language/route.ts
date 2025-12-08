import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { locales } from "@/core/i18n/config";

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
    const { language } = await request.json();

    if (!language || typeof language !== 'string') {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    // Validate language
    if (!locales.includes(language as any)) {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      language,
    });
  } catch (error) {
    console.error('Error updating language:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

