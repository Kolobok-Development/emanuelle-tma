import { prisma } from "@/core/db/prisma";
import { encrypt, SESSION_DURATION, setSessionCookie } from "@/utils/sessions";
import { isValid, parse } from "@tma.js/init-data-node";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json(
        { error: "No initData provided" },
        { status: 400 }
      );
    }


  
    const isAuthorized = process.env.NODE_ENV === 'development' || isValid(initData, process.env.TELEGRAM_BOT_KEY as string);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Invalid initData", details: "Authorization failed" },
        { status: 401 }
      );
    }

    const parsedInitData = parse(initData);

    const telegramUser = parsedInitData.user;

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Invalid initData", details: "Telegram user not found" },
        { status: 401 }
      );
    }

    let user = await prisma.users.findFirst({
      where: { telegram_id: BigInt(telegramUser.id) }, // Changed from Number to BigInt
      include: { settings: true },
    });

    if (!user) {
      user = await prisma.users.create({
        data: {
          telegram_id: BigInt(telegramUser.id), // Consistent BigInt
          username: telegramUser.username || null,
          settings: {
            create: {
              tone: "friendly",
              language: "en",
            },
          },
        },
        include: { settings: true },
      });
    } else {
      user = await prisma.users.update({
        where: { id: user.id },
        data: {
          username: telegramUser.username || user.username,
        },
        include: { settings: true },
      });
    }

    // Create session in database and generate JWT
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    const payload = {
      sub: user.id,
      telegram_id: String(telegramUser.id),
    };
    const token = await encrypt(payload, expiresAt);

    // Store session in database
    await prisma.session.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });

    const res = NextResponse.json({
      success: true,
      session: {
        token,
        expires_at: expiresAt,
      },
      user: {
        id: user.id,
        telegram_id: Number(user.telegram_id), // Convert BigInt to Number for JSON serialization
        username: user.username,
        settings: user.settings,
        diamonds: user.diamonds,
        energy: user.energy,
        gender: user.gender,
      },
    });

    // Set session cookie
    const cookieData = setSessionCookie(res, token, expiresAt);
    res.cookies.set(cookieData);

    return res;
  } catch (error) {
    console.error("Error in telegram-login:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
