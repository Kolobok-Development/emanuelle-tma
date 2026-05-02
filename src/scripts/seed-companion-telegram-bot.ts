/**
 * Upserts one CompanionTelegramBot row for local / QA testing.
 * Run after: npm run seed:companions
 *
 * Env:
 *   SEED_BOT_COMPANION_ID  — AICompanion.id (default: emmanuelle)
 *   SEED_BOT_USERNAME      — unique bot username without @
 *   SEED_BOT_WEBHOOK_SECRET — must match setWebhook secret_token for this bot
 *   SEED_BOT_TOKEN         — real BotFather token, or placeholder for webhook-only tests
 */
import 'dotenv/config';
import crypto from 'crypto';
import { prisma } from '@/core/db/prisma';

const companionId = process.env.SEED_BOT_COMPANION_ID || 'emanuelle';
const botUsername =
  process.env.SEED_BOT_USERNAME || `dev_companion_bot_${companionId}`.slice(0, 32);
const webhookSecret =
  process.env.SEED_BOT_WEBHOOK_SECRET ||
  `dev_whsec_${companionId}_${crypto.randomBytes(8).toString('hex')}`;
const botToken =
  process.env.SEED_BOT_TOKEN || '000000000:PLACEHOLDER_USE_REAL_TOKEN_FOR_TELEGRAM';

async function main() {
  const companion = await prisma.aICompanion.findUnique({ where: { id: companionId } });
  if (!companion) {
    console.error(`Companion "${companionId}" not found. Run: npm run seed:companions`);
    process.exit(1);
  }

  await prisma.companionTelegramBot.upsert({
    where: { companion_id: companionId },
    create: {
      companion_id: companionId,
      bot_username: botUsername,
      webhook_secret: webhookSecret,
      bot_token: botToken,
    },
    update: {
      bot_username: botUsername,
      webhook_secret: webhookSecret,
      bot_token: botToken,
    },
  });

  console.log('CompanionTelegramBot upserted for companion_id:', companionId);
  console.log('  bot_username:', botUsername);
  console.log('  webhook_secret (use in curl + setWebhook):', webhookSecret);
  console.log(
    '  bot_token: set SEED_BOT_TOKEN for production; placeholder is OK for resolver-only HTTP tests.'
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
