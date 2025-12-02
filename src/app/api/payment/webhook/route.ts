import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/db/prisma";
import { PaymentStatus } from "@prisma/client";
import { validateTelegramWebhook } from "@/utils/webhook";
import { UserService } from "@/lib/user";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_KEY;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] Payment webhook received`);
  
  try {
    // Validate webhook authentication
    console.log('🔐 Validating webhook authentication...');
    if (!validateTelegramWebhook(request)) {
      console.error('❌ Webhook validation failed - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Webhook authentication passed');

    if (!BOT_TOKEN) {
      console.error('❌ Bot token not configured');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const update = await request.json();
    console.log('📦 Received update:', JSON.stringify(update, null, 2));

    // Step 1: Approve the payment
    if (update.pre_checkout_query) {
      console.log('💳 Processing pre_checkout_query...');
      const { id: queryId, invoice_payload, total_amount, currency } = update.pre_checkout_query;
      console.log(`   Query ID: ${queryId}`);
      console.log(`   Invoice Payload (offerId): ${invoice_payload}`);
      console.log(`   Total Amount: ${total_amount}`);
      console.log(`   Currency: ${currency}`);

      // Validate currency
      if (currency !== 'XTR') {
        console.warn(`⚠️  Invalid currency: ${currency}, expected XTR`);
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Only Telegram Stars (XTR) payments are accepted',
          }),
        });
        return NextResponse.json({ ok: true });
      }

      // Find pending transaction (invoice_payload is the offerId)
      console.log(`🔍 Looking up transaction for offerId: ${invoice_payload}`);
      const transaction = await prisma.paymentTransactions.findFirst({
        where: {
          offer_id: invoice_payload,
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction) {
        console.error(`❌ No pending transaction found for offerId: ${invoice_payload}`);
      } else {
        console.log(`✅ Found transaction:`, {
          id: transaction.id,
          offerId: transaction.offer_id,
          amount: transaction.amount,
          status: transaction.status,
          offer: transaction.offer ? {
            id: transaction.offer.id,
            diamonds: transaction.offer.diamonds,
            energy: transaction.offer.energy
          } : null
        });
      }

      if (!transaction || transaction.amount !== total_amount) {
        console.error(`❌ Transaction validation failed:`, {
          transactionExists: !!transaction,
          transactionAmount: transaction?.amount,
          expectedAmount: total_amount,
          amountsMatch: transaction?.amount === total_amount
        });
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: false,
            error_message: 'Payment request not found or invalid',
          }),
        });
        return NextResponse.json({ ok: true });
      }

      // Approve payment
      console.log(`✅ Approving pre_checkout_query ${queryId}`);
      const approveResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: queryId,
          ok: true,
        }),
      });
      const approveResult = await approveResponse.json();
      console.log(`📤 Pre-checkout approval response:`, approveResult);
      return NextResponse.json({ ok: true });
    }

    // Step 2: Handle successful payment
    if (update.message?.successful_payment) {
      console.log('💰 Processing successful payment...');
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;
      const offerId = payment.invoice_payload; // This is the offerId
      
      console.log(`   User ID: ${userId}`);
      console.log(`   Offer ID (invoice_payload): ${offerId}`);
      console.log(`   Payment Charge ID: ${payment.telegram_payment_charge_id}`);
      console.log(`   Total Amount: ${payment.total_amount}`);
      console.log(`   Currency: ${payment.currency}`);

      // Find pending transaction
      console.log(`🔍 Looking up transaction for offerId: ${offerId}`);
      const transaction = await prisma.paymentTransactions.findFirst({
        where: {
          offer_id: offerId,
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction) {
        console.error(`❌ Transaction not found for offerId: ${offerId}`);
        console.log(`   Searched for: offer_id=${offerId}, status=PENDING`);
        return NextResponse.json({ ok: true });
      }

      console.log(`✅ Found transaction:`, {
        id: transaction.id,
        offerId: transaction.offer_id,
        amount: transaction.amount,
        status: transaction.status,
        invoiceId: transaction.invoice_id,
        createdAt: transaction.created_at,
        offer: transaction.offer ? {
          id: transaction.offer.id,
          diamonds: transaction.offer.diamonds,
          energy: transaction.offer.energy
        } : null
      });

      // Check if already processed
      if (transaction.invoice_id) {
        console.log(`⚠️  Payment ${payment.telegram_payment_charge_id} already processed (invoice_id: ${transaction.invoice_id})`);
        return NextResponse.json({ ok: true });
      }

      // Get user
      console.log(`🔍 Looking up user for telegram_id: ${userId}`);
      const user = await UserService.getUserByTelegramId(BigInt(userId));
      if (!user) {
        console.error(`❌ User not found for telegram_id: ${userId}`);
        return NextResponse.json({ ok: true });
      }
      
      console.log(`✅ Found user:`, {
        id: user.id,
        telegramId: user.telegram_id?.toString(),
        currentDiamonds: user.diamonds,
        currentEnergy: user.energy
      });

      // Process payment
      try {
        console.log('💾 Starting database transaction...');
        await prisma.$transaction(async (tx) => {
          // Update transaction
          console.log(`   Updating transaction ${transaction.id} to COMPLETED`);
          await tx.paymentTransactions.update({
            where: { id: transaction.id },
            data: {
              invoice_id: payment.telegram_payment_charge_id,
              status: PaymentStatus.COMPLETED,
              completed_at: new Date(),
            },
          });
          console.log(`   ✅ Transaction updated successfully`);

          // Update user balance if offer exists
          if (transaction.offer) {
            const { diamonds, energy } = transaction.offer;
            const diamondsToAdd = diamonds || 0;
            const energyToAdd = energy || 0;
            
            console.log(`   Updating user balance:`, {
              userId: user.id,
              diamondsToAdd,
              energyToAdd,
              currentDiamonds: user.diamonds,
              currentEnergy: user.energy,
              newDiamonds: (user.diamonds || 0) + diamondsToAdd,
              newEnergy: (user.energy || 0) + energyToAdd
            });
            
            await tx.users.update({
              where: { id: user.id },
              data: {
                diamonds: { increment: diamondsToAdd },
                energy: { increment: energyToAdd },
              },
            });
            console.log(`   ✅ User balance updated successfully`);
          } else {
            console.warn(`   ⚠️  No offer found in transaction, skipping balance update`);
          }
        });
        console.log('✅ Database transaction completed');

        // Send confirmation message
        console.log(`📤 Sending confirmation message to user ${userId}`);
        await sendTelegramMessage(
          userId,
          `✅ Payment Successful!\n\n` +
          `Receipt ID: \`${payment.telegram_payment_charge_id}\``
        );

        // Verify the update
        const updatedUser = await prisma.users.findUnique({
          where: { id: user.id },
          select: { diamonds: true, energy: true }
        });
        console.log(`✅ Payment ${payment.telegram_payment_charge_id} processed successfully for user ${userId}`);
        console.log(`   Final balance:`, {
          diamonds: updatedUser?.diamonds,
          energy: updatedUser?.energy
        });
        return NextResponse.json({ ok: true });
      } catch (error: any) {
        console.error('❌ Error processing payment:', error);
        console.error('   Error name:', error.name);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        
        // Check if schema error (diamonds/energy fields missing)
        if (error.message?.includes('diamonds') || error.message?.includes('energy')) {
          console.error('⚠️  Users model missing diamonds/energy fields. Please run migration.');
          // Still mark as completed to prevent retries
          console.log(`   Marking transaction ${transaction.id} as completed despite error`);
          await prisma.paymentTransactions.update({
            where: { id: transaction.id },
            data: {
              invoice_id: payment.telegram_payment_charge_id,
              status: PaymentStatus.COMPLETED,
              completed_at: new Date(),
            },
          });
          return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: true });
      }
    }

    // Mandatory /paysupport handler
    if (update.message?.text === '/paysupport') {
      console.log('🛟 Handling /paysupport command');
      await sendTelegramMessage(
        update.message.from.id,
        '🛟 For payment support, contact support team'
      );
      return NextResponse.json({ ok: true });
    }

    console.log('⚠️  Update type not recognized - no pre_checkout_query or successful_payment');
    console.log('   Update keys:', Object.keys(update));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Fatal error in payment webhook:', error);
    console.error('   Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
