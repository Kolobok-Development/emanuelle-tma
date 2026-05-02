/**
 * HTTP smoke tests for /api/bot/webhook (plan sections 3.1–3.3, 3.5 payment route auth).
 *
 * Requires app running: TEST_BASE_URL (default http://localhost:3000)
 * For 401 on wrong secret: set TELEGRAM_MAIN_BOT_WEBHOOK_SECRET or TELEGRAM_WEBHOOK_SECRET_TOKEN in the **server** env.
 * For companion test: set TEST_COMPANION_WEBHOOK_SECRET to a DB row's webhook_secret (after seed:companion-bot).
 */
import 'dotenv/config';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

/** Avoid hanging when dev accepts POSTs without secret and the handler awaits DB/Redis. */
const FETCH_MS = Math.max(5_000, Number(process.env.TEST_FETCH_TIMEOUT_MS) || 30_000);

function fetchOpts(init?: RequestInit): RequestInit {
  return { ...init, signal: AbortSignal.timeout(FETCH_MS) };
}

const MESSAGE_BODY = JSON.stringify({
  message: {
    message_id: 1,
    chat: { id: 1 },
    from: { id: 1, first_name: 'Test' },
    text: 'hi',
  },
});

function hubSecret(): string | undefined {
  return (
    process.env.TELEGRAM_MAIN_BOT_WEBHOOK_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN ||
    undefined
  );
}

async function postWebhook(
  path: '/api/bot/webhook' | '/api/payment/webhook',
  secret: string | undefined
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== undefined && secret !== '') {
    headers['X-Telegram-Bot-Api-Secret-Token'] = secret;
  }
  return fetch(`${BASE}${path}`, fetchOpts({ method: 'POST', headers, body: MESSAGE_BODY }));
}

function fail(msg: string): never {
  console.error('FAIL:', msg);
  process.exit(1);
}

async function main() {
  console.log('Base URL:', BASE);

  // GET smoke
  for (const path of ['/api/bot/webhook', '/api/payment/webhook'] as const) {
    const r = await fetch(`${BASE}${path}`, fetchOpts());
    if (!r.ok) fail(`GET ${path} expected 200, got ${r.status}`);
    console.log('OK GET', path);
  }

  const mainSecret = hubSecret();
  const companionSecret = process.env.TEST_COMPANION_WEBHOOK_SECRET;

  // 3.1 wrong secret — only POST when hub secret is set locally (matches server); otherwise dev accepts and the handler may hang on DB/Redis.
  if (mainSecret) {
    const wrong = await postWebhook('/api/bot/webhook', 'wrong-secret-definitely-invalid');
    if (wrong.status !== 401) {
      fail(`3.1 wrong secret: expected 401, got ${wrong.status}`);
    }
    console.log('OK 3.1 wrong X-Telegram-Bot-Api-Secret-Token -> 401');
  } else {
    console.log(
      'SKIP 3.1 (no TELEGRAM_MAIN_BOT_WEBHOOK_SECRET / TELEGRAM_WEBHOOK_SECRET_TOKEN in env — set on server and in .env for this script to assert 401)'
    );
  }

  // 3.2 hub tenant
  if (mainSecret) {
    const ok = await postWebhook('/api/bot/webhook', mainSecret);
    if (ok.status !== 200) {
      fail(`3.2 hub secret: expected 200, got ${ok.status} ${await ok.text()}`);
    }
    const j = await ok.json();
    if (j.ok !== true) fail(`3.2 expected body.ok true, got ${JSON.stringify(j)}`);
    console.log('OK 3.2 hub webhook POST -> 200 { ok: true }');
  } else {
    console.log('SKIP 3.2 (set TELEGRAM_MAIN_BOT_WEBHOOK_SECRET on server and re-run)');
  }

  // 3.3 companion
  if (companionSecret && mainSecret) {
    const c = await postWebhook('/api/bot/webhook', companionSecret);
    if (c.status !== 200) {
      fail(`3.3 companion secret: expected 200, got ${c.status}`);
    }
    console.log('OK 3.3 companion webhook POST -> 200');
  } else {
    console.log('SKIP 3.3 (set TEST_COMPANION_WEBHOOK_SECRET to match seed:companion-bot row)');
  }

  // 3.5 payment route rejects wrong secret when hub secret configured
  if (mainSecret) {
    const pBad = await postWebhook('/api/payment/webhook', 'wrong-payment-secret');
    if (pBad.status !== 401) {
      fail(`3.5 payment wrong secret: expected 401, got ${pBad.status}`);
    }
    console.log('OK 3.5 payment webhook wrong secret -> 401');
  }

  console.log('\nDone. Regression / security: wrong-secret cases exercised when secrets are set.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
