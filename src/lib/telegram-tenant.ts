import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';

export type WebhookTenantContext = {
  botToken: string;
  companionId: string | null;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Primary hub bot token (falls back to legacy env names). */
export function getMainBotToken(): string | undefined {
  return (
    process.env.TELEGRAM_MAIN_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_KEY ||
    process.env.TELEGRAM_BOT_TOKEN ||
    undefined
  );
}

/** Webhook secret for the hub bot (falls back to legacy global secret). */
export function getMainWebhookSecret(): string | undefined {
  return (
    process.env.TELEGRAM_MAIN_BOT_WEBHOOK_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ||
    undefined
  );
}

/**
 * Resolves which bot received the webhook from X-Telegram-Bot-Api-Secret-Token.
 * Hub: header matches main webhook secret. Companion: unique webhook_secret row.
 */
export async function resolveWebhookTenantFromRequest(
  request: NextRequest
): Promise<WebhookTenantContext | null> {
  const header = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const mainSecret = getMainWebhookSecret();
  const mainToken = getMainBotToken();

  if (!mainSecret && process.env.NODE_ENV !== 'production') {
    if (!mainToken) {
      return null;
    }
    return { botToken: mainToken, companionId: null };
  }

  if (!header || !mainToken || !mainSecret) {
    return null;
  }

  if (timingSafeEqual(header, mainSecret)) {
    return { botToken: mainToken, companionId: null };
  }

  const companionRow = await prisma.companionTelegramBot.findUnique({
    where: { webhook_secret: header },
  });

  if (companionRow) {
    return {
      botToken: companionRow.bot_token,
      companionId: companionRow.companion_id,
    };
  }

  return null;
}

export async function getBotTokenForCompanion(
  companionId: string
): Promise<string | undefined> {
  const row = await prisma.companionTelegramBot.findUnique({
    where: { companion_id: companionId },
  });
  return row?.bot_token ?? getMainBotToken();
}
