# Multi-bot manual E2E checklist (Telegram)

Use after automated scripts: `npm run seed:companions`, `npm run seed:companion-bot`, `npm run test:multibot-webhooks`, `npm run test:multibot-api-smoke`.

Prerequisites: hub bot `setWebhook` to `/api/bot/webhook`; companion bot same URL with `secret_token` = row `webhook_secret`; queue worker running; Redis + Postgres; real `SEED_BOT_TOKEN` for companion for full E2E.

## Hub

- [ ] Open Mini App from hub bot → login → `GET /api/auth/me` shows `app_scope: hub`, `locked_companion_id: null`
- [ ] DM hub bot → AI reply from hub account
- [ ] Buy Stars from hub session → payment completes; confirmation from hub bot

## Dedicated companion bot

- [ ] Replace placeholder `bot_token` in DB with real token; `setWebhook` with matching `webhook_secret`
- [ ] Open Mini App from companion bot (`start_param` = `companion_id` if configured)
- [ ] `GET /api/auth/me` → `app_scope: dedicated`, `locked_companion_id` = that id
- [ ] Bottom nav: 3 items; Home → `/companion/<id>`; no Tasks
- [ ] Visit `/dashboard` → redirected to locked companion page
- [ ] `GET /api/companion/get-all` → only one companion
- [ ] `POST /api/companion/initiate-chat` with wrong `companionId` → 403
- [ ] DM companion bot → reply from **that** bot (check Telegram sender)
- [ ] Stars purchase from dedicated session → invoice + webhook use companion token

## Regression

- [ ] Delete or skip `CompanionTelegramBot` rows → dedicated auth 401; hub still works

## Security (manual)

- [ ] Webhook POST with wrong `X-Telegram-Bot-Api-Secret-Token` → 401 (or run `npm run test:multibot-webhooks` with hub secret set on server)
- [ ] Dedicated login: `initData` from companion A but request body `companionId` for B → expect 401 (spoof attempt)

## Logs

- [ ] Confirm no raw bot tokens in application logs
