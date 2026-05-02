# Multi-bot operations runbook

## Environment (hub)

- `TELEGRAM_MAIN_BOT_TOKEN` — hub bot token (optional if you still use `TELEGRAM_BOT_KEY` / `TELEGRAM_BOT_TOKEN`).
- `TELEGRAM_MAIN_BOT_WEBHOOK_SECRET` — `secret_token` passed to `setWebhook` for the hub bot (optional if you still use `TELEGRAM_WEBHOOK_SECRET_TOKEN`).

Legacy variables remain supported: `TELEGRAM_BOT_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`.

## Per-companion bot (database)

For each `AICompanion`, insert a row in `CompanionTelegramBot`:

- `companion_id` — UUID of the companion (matches `AICompanion.id`).
- `bot_username` — Telegram username without `@`, unique.
- `webhook_secret` — unique random string; use the same value in BotFather `setWebhook` as `secret_token`.
- `bot_token` — BotFather token for this bot.

Do not commit tokens to git. Prefer a secrets manager or encrypted storage for production.

## Webhook URL

All bots (hub and companions) can use the same HTTPS URL:

- Messaging + Stars (unified): `POST https://<host>/api/bot/webhook`
- Optional legacy payment-only URL: `POST https://<host>/api/payment/webhook`

Each bot must call `setWebhook` with its own `secret_token` that matches the row (hub → main env secret; companion → `CompanionTelegramBot.webhook_secret`).

## Mini App auth

- Hub: open the Mini App from the hub bot; client sends `authContext: hub` (default).
- Dedicated: open from the companion bot with `start_param` = companion id (or navigate to `/companion/<id>`). Client sends `authContext: dedicated` and `companionId`.

## Workers

Queue jobs carry `botToken` for AI replies. If missing, workers fall back to `getMainBotToken()`. Ensure at least one of `TELEGRAM_MAIN_BOT_TOKEN`, `TELEGRAM_BOT_KEY`, or `TELEGRAM_BOT_TOKEN` is set for legacy jobs.

## Migration

1. Apply Prisma migrations: `npx prisma migrate deploy` (or `migrate dev` locally).
2. Run `npx prisma generate`.
3. Configure hub `setWebhook` with `TELEGRAM_MAIN_BOT_WEBHOOK_SECRET` (or legacy global secret).
4. Insert `CompanionTelegramBot` rows and `setWebhook` for each companion bot.
5. Smoke-test: hub login, dedicated login, DM on companion bot, Stars purchase on both.

## Logging

Never log raw bot tokens. Use `companion_id`, `bot_username`, or `hub` in structured logs only.
