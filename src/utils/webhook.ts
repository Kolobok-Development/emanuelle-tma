import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Validates Telegram webhook authentication using secret token
 */
export function validateTelegramWebhook(request: NextRequest): boolean {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  
  if (!secretToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: TELEGRAM_WEBHOOK_SECRET_TOKEN not set in production!');
      return false;
    }
    // Allow in development if token not set
    return true;
  }

  const headerToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  
  if (!headerToken) {
    return false;
  }

  if (headerToken.length !== secretToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(secretToken)
    );
  } catch {
    return false;
  }
}

