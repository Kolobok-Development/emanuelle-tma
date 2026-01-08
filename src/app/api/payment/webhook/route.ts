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
  const startTime = Date.now();
  globalThis?.logger?.info({}, 'Payment webhook received');
  
  try {
    // Validate webhook authentication
    if (!validateTelegramWebhook(request)) {
      globalThis?.logger?.warn({}, 'Webhook validation failed - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    globalThis?.logger?.info({}, 'Webhook authentication passed');

    if (!BOT_TOKEN) {
      globalThis?.logger?.error({}, 'Bot token not configured');
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const update = await request.json();
    globalThis?.logger?.info({ updateType: Object.keys(update) }, 'Received payment webhook update');

    // Step 1: Approve the payment
    if (update.pre_checkout_query) {
      const { id: queryId, invoice_payload, total_amount, currency } = update.pre_checkout_query;
      globalThis?.logger?.info({ queryId, invoice_payload, total_amount, currency }, 'Processing pre_checkout_query');

      // Validate currency
      if (currency !== 'XTR') {
        globalThis?.logger?.warn({ currency, queryId }, 'Invalid currency, expected XTR');
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
      const transaction = await prisma.paymentTransactions.findFirst({
        where: {
          payload: { contains: invoice_payload },
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction) {
        globalThis?.logger?.warn({ invoice_payload }, 'No pending transaction found for offerId');
      } else {
        globalThis?.logger?.info({ 
          transactionId: transaction.id,
          offerId: transaction.offer_id,
          amount: transaction.amount,
          status: transaction.status
        }, 'Found transaction');
      }

      if (!transaction || transaction.amount !== total_amount) {
        globalThis?.logger?.error({ 
          transactionExists: !!transaction,
          transactionAmount: transaction?.amount,
          expectedAmount: total_amount,
          amountsMatch: transaction?.amount === total_amount
        }, 'Transaction validation failed');
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
      globalThis?.logger?.info({ queryId }, 'Approving pre_checkout_query');
      const approveResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: queryId,
          ok: true,
        }),
      });
      const approveResult = await approveResponse.json();
      globalThis?.logger?.info({ queryId, result: approveResult }, 'Pre-checkout approval response');
      return NextResponse.json({ ok: true });
    }

    // Step 2: Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;
      const offerId = payment.invoice_payload; // This is the request_id
      
      globalThis?.logger?.info({ 
        userId, 
        offerId, 
        chargeId: payment.telegram_payment_charge_id,
        amount: payment.total_amount,
        currency: payment.currency
      }, 'Processing successful payment');

      // Find pending transaction
      const transaction = await prisma.paymentTransactions.findFirst({
        where: {
          payload: { contains: offerId },
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction) {
        globalThis?.logger?.warn({ offerId }, 'Transaction not found for offerId');
        return NextResponse.json({ ok: true });
      }

      globalThis?.logger?.info({ 
        transactionId: transaction.id,
        offerId: transaction.offer_id,
        amount: transaction.amount,
        status: transaction.status
      }, 'Found transaction');

      // Check if already processed
      if (transaction.invoice_id) {
        globalThis?.logger?.warn({ 
          chargeId: payment.telegram_payment_charge_id,
          invoiceId: transaction.invoice_id
        }, 'Payment already processed');
        return NextResponse.json({ ok: true });
      }

      // Get user
      const user = await prisma.users.findUnique({
          where: { telegram_id: BigInt(userId) },
      })

      if (!user) {
        globalThis?.logger?.error({ userId }, 'User not found for telegram_id');
        return NextResponse.json({ ok: true });
      }
      
      globalThis?.logger?.info({ 
        userId: user.id,
        telegramId: user.telegram_id?.toString(),
        currentDiamonds: user.diamonds,
        currentEnergy: user.energy
      }, 'Found user');

      // Process payment
      try {
        globalThis?.logger?.info({ transactionId: transaction.id }, 'Starting database transaction');
        await prisma.$transaction(async (tx) => {
          // Update transaction
          await tx.paymentTransactions.update({
            where: { id: transaction.id },
            data: {
              invoice_id: payment.telegram_payment_charge_id,
              status: PaymentStatus.COMPLETED,
              completed_at: new Date(),
            },
          });
          globalThis?.logger?.info({ transactionId: transaction.id }, 'Transaction updated successfully');

          // Update user balance if offer exists
          if (transaction.offer) {
            const { diamonds, energy } = transaction.offer;
            const diamondsToAdd = diamonds || 0;
            const energyToAdd = energy || 0;
            
            globalThis?.logger?.info({ 
              userId: user.id,
              diamondsToAdd,
              energyToAdd,
              currentDiamonds: user.diamonds,
              currentEnergy: user.energy
            }, 'Updating user balance');
            
            await tx.users.update({
              where: { id: user.id },
              data: {
                diamonds: { increment: diamondsToAdd },
                energy: { increment: energyToAdd },
              },
            });
            globalThis?.logger?.info({ userId: user.id }, 'User balance updated successfully');
          } else {
            globalThis?.logger?.warn({ transactionId: transaction.id }, 'No offer found in transaction, skipping balance update');
          }
        });
        globalThis?.logger?.info({}, 'Database transaction completed');

        // Send confirmation message
        globalThis?.logger?.info({ userId }, 'Sending confirmation message to user');
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
        globalThis?.logger?.info({ 
          chargeId: payment.telegram_payment_charge_id,
          userId,
          finalBalance: {
            diamonds: updatedUser?.diamonds,
            energy: updatedUser?.energy
          },
          duration: Date.now() - startTime
        }, 'Payment processed successfully');
        return NextResponse.json({ ok: true });
      } catch (error: any) {
        globalThis?.logger?.error({ 
          error: error.message,
          errorName: error.name,
          stack: error.stack,
          transactionId: transaction.id
        }, 'Error processing payment');
        
        // Check if schema error (diamonds/energy fields missing)
        if (error.message?.includes('diamonds') || error.message?.includes('energy')) {
          globalThis?.logger?.error({ transactionId: transaction.id }, 'Users model missing diamonds/energy fields. Please run migration.');
          // Still mark as completed to prevent retries
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
      globalThis?.logger?.info({ userId: update.message.from.id }, 'Handling /paysupport command');
      await sendTelegramMessage(
        update.message.from.id,
        '🛟 For payment support, contact support team'
      );
      return NextResponse.json({ ok: true });
    }

    globalThis?.logger?.warn({ updateKeys: Object.keys(update) }, 'Update type not recognized - no pre_checkout_query or successful_payment');
    return NextResponse.json({ ok: true });
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }, 'Fatal error in payment webhook');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
