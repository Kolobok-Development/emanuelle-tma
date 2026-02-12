import { prisma } from "@/core/db/prisma";
import { encrypt, SESSION_DURATION, setSessionCookie } from "@/utils/sessions";
import { isValid, parse } from "@tma.js/init-data-node";
import { NextRequest, NextResponse } from "next/server";
import { trackHttpMetrics, trackDBQuery } from "@/lib/metrics-helpers";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let response: NextResponse | undefined;
  try {
    const { initData } = await request.json();

    if (!initData) {
      globalThis?.logger?.warn({}, 'No initData provided');
      response = NextResponse.json(
        { error: "No initData provided" },
        { status: 400 }
      );
      return response;
    }

    const isAuthorized = process.env.NODE_ENV === 'development' || isValid(initData, process.env.TELEGRAM_BOT_KEY as string);

    if (!isAuthorized) {
      globalThis?.logger?.warn({}, 'Invalid initData - authorization failed');
      response = NextResponse.json(
        { error: "Invalid initData", details: "Authorization failed" },
        { status: 401 }
      );
      return response;
    }

    const parsedInitData = parse(initData);
    const telegramUser = parsedInitData.user;

    if (!telegramUser) {
      globalThis?.logger?.warn({}, 'Telegram user not found in initData');
      response = NextResponse.json(
        { error: "Invalid initData", details: "Telegram user not found" },
        { status: 401 }
      );
      return response;
    }

    globalThis?.logger?.info({ telegramUserId: telegramUser.id, username: telegramUser.username }, 'Processing authentication');

    const dbStartTime = Date.now();
    let user = await prisma.users.findFirst({
      where: { telegram_id: BigInt(telegramUser.id) },
      include: { settings: true },
    });
    trackDBQuery('select', 'users', (Date.now() - dbStartTime) / 1000);

    if (!user) {
      globalThis?.logger?.info({ telegramUserId: telegramUser.id }, 'Creating new user');
      const createStartTime = Date.now();
      user = await prisma.users.create({
        data: {
          telegram_id: BigInt(telegramUser.id),
          username: telegramUser.username || null,
          diamonds: 10,
          energy: 100,
          settings: {
            create: {
              tone: "friendly",
              language: "en",
            },
          },
        },
        include: { settings: true },
      });
      trackDBQuery('insert', 'users', (Date.now() - createStartTime) / 1000);
      globalThis?.logger?.info({ userId: user.id, telegramUserId: telegramUser.id }, 'New user created');
    } else {
      globalThis?.logger?.info({ userId: user.id, telegramUserId: telegramUser.id }, 'Updating existing user');
      const updateStartTime = Date.now();
      user = await prisma.users.update({
        where: { id: user.id },
        data: {
          username: telegramUser.username || user.username,
        },
        include: { settings: true },
      });
      trackDBQuery('update', 'users', (Date.now() - updateStartTime) / 1000);
    }

    // Create session in database and generate JWT
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    const payload = {
      sub: user.id,
      telegram_id: String(telegramUser.id),
    };
    const token = await encrypt(payload, expiresAt);

    // Store session in database
    const sessionStartTime = Date.now();
    await prisma.session.create({
      data: {
        user_id: user.id,
        token,
        expires_at: expiresAt,
      },
    });
    trackDBQuery('insert', 'session', (Date.now() - sessionStartTime) / 1000);

    globalThis?.logger?.info({ 
      userId: user.id, 
      telegramUserId: telegramUser.id,
      duration: Date.now() - startTime 
    }, 'Authentication successful');

    const res = NextResponse.json({
      success: true,
      session: {
        token,
        expires_at: expiresAt,
      },
      user: {
        id: user.id,
        telegram_id: Number(user.telegram_id),
        username: user.username,
        settings: user.settings,
        diamonds: user.diamonds,
        energy: user.energy,
        gender: user.gender,
        onboarding_completed_at: user.onboarding_completed_at?.toISOString() ?? null,
      },
    });

    // Set session cookie
    const cookieData = setSessionCookie(res, token, expiresAt);
    res.cookies.set(cookieData);

    response = res;
    return res;
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }, 'Error in authentication');
    response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    return response;
  } finally {
    // Track HTTP metrics
    if (response) {
      trackHttpMetrics(request, response, startTime);
    }
  }
}
