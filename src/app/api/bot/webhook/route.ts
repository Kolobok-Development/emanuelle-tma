import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebhook } from '@/utils/webhook';
import { handlePaymentWebhook } from './handlers/payment-handler';
import { handleMessagingWebhook } from './handlers/messaging-handler';
import { MAX_PAYLOAD_SIZE } from './utils';


export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] Unified webhook received`);
  
  try {
    console.log('🔐 Validating webhook authentication...');
    if (!validateTelegramWebhook(request)) {
      console.error('❌ Webhook validation failed - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Webhook authentication passed');

    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      console.error(`Payload too large: ${rawBody.length} bytes (max: ${MAX_PAYLOAD_SIZE})`);
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    let update;
    try {
      update = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Invalid JSON payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('📦 Received update:', JSON.stringify(update, null, 2));

    const isPaymentWebhook = 
      update.pre_checkout_query !== undefined ||
      update.message?.successful_payment !== undefined ||
      update.message?.text === '/paysupport';

    if (isPaymentWebhook) {
      console.log('💳 Routing to payment webhook handler');
      return await handlePaymentWebhook(update);
    } else {
      console.log('💬 Routing to messaging webhook handler');
      return await handleMessagingWebhook(update);
    }
  } catch (error) {
    console.error('❌ Fatal error in unified webhook:', error);
    console.error('   Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
