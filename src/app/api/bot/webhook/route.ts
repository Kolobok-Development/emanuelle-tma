import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebhook } from '@/utils/webhook';
import { handlePaymentWebhook } from './handlers/payment-handler';
import { handleMessagingWebhook } from './handlers/messaging-handler';
import { MAX_PAYLOAD_SIZE } from './utils';
import { trackHttpMetrics } from '@/lib/metrics-helpers';


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  globalThis?.logger?.info({}, 'Unified webhook received');
  let response: NextResponse | undefined;
  
  try {
    if (!validateTelegramWebhook(request)) {
      globalThis?.logger?.warn({}, 'Webhook validation failed - Unauthorized');
      response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return response;
    }
    globalThis?.logger?.info({}, 'Webhook authentication passed');

    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      globalThis?.logger?.error({ 
        payloadSize: rawBody.length,
        maxSize: MAX_PAYLOAD_SIZE
      }, 'Payload too large');
      response = NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
      return response;
    }

    let update;
    try {
      update = JSON.parse(rawBody);
    } catch (parseError) {
      globalThis?.logger?.error({ 
        error: parseError instanceof Error ? parseError.message : String(parseError)
      }, 'Invalid JSON payload');
      response = NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
      return response;
    }

    globalThis?.logger?.info({ updateType: Object.keys(update) }, 'Received webhook update');

    const isPaymentWebhook = 
      update.pre_checkout_query !== undefined ||
      update.message?.successful_payment !== undefined ||
      update.message?.text === '/paysupport';

    if (isPaymentWebhook) {
      globalThis?.logger?.info({}, 'Routing to payment webhook handler');
      response = await handlePaymentWebhook(update);
      return response;
    } else {
      globalThis?.logger?.info({}, 'Routing to messaging webhook handler');
      response = await handleMessagingWebhook(update);
      return response;
    }
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }, 'Fatal error in unified webhook');
    response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return response;
  } finally {
    // Track HTTP metrics
    if (response) {
      trackHttpMetrics(request, response, startTime);
    }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
