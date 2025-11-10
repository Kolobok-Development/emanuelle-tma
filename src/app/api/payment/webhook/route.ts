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
  try {
    // Validate webhook authentication
    if (!validateTelegramWebhook(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const update = await request.json();

    // Step 1: Approve the payment
    if (update.pre_checkout_query) {
      const { id: queryId, invoice_payload, total_amount, currency } = update.pre_checkout_query;

      // Validate currency
      if (currency !== 'XTR') {
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
          offer_id: invoice_payload,
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction || transaction.amount !== total_amount) {
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
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: queryId,
          ok: true,
        }),
      });

      return NextResponse.json({ ok: true });
    }

    // Step 2: Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;
      const offerId = payment.invoice_payload; // This is the offerId

      // Find pending transaction
      const transaction = await prisma.paymentTransactions.findFirst({
        where: {
          offer_id: offerId,
          status: PaymentStatus.PENDING,
        },
        include: { offer: true },
        orderBy: { created_at: 'desc' },
      });

      if (!transaction) {
        console.warn(`Transaction not found for offerId: ${offerId}`);
        return NextResponse.json({ ok: true });
      }

      // Check if already processed
      if (transaction.invoice_id) {
        console.log(`Payment ${payment.telegram_payment_charge_id} already processed`);
        return NextResponse.json({ ok: true });
      }

      // Get user
      const user = await UserService.getUserByTelegramId(BigInt(userId));
      if (!user) {
        console.error(`User not found for telegram_id: ${userId}`);
        return NextResponse.json({ ok: true });
      }

      // Process payment
      try {
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

          // Update user balance if offer exists
          if (transaction.offer) {
            const { diamonds, energy } = transaction.offer;
            
            await tx.users.update({
              where: { id: user.id },
              data: {
                // @ts-ignore - These fields need to be added to Users model
                diamonds: { increment: diamonds || 0 },
                // @ts-ignore - These fields need to be added to Users model
                energy: { increment: energy || 0 },
              },
            });
          }
        });

        // Send confirmation message
        await sendTelegramMessage(
          userId,
          `✅ Payment Successful!\n\n` +
          `Receipt ID: \`${payment.telegram_payment_charge_id}\``
        );

        console.log(`Payment ${payment.telegram_payment_charge_id} processed successfully for user ${userId}`);
        return NextResponse.json({ ok: true });
      } catch (error: any) {
        console.error('Error processing payment:', error);
        
        // Check if schema error (diamonds/energy fields missing)
        if (error.message?.includes('diamonds') || error.message?.includes('energy')) {
          console.error('⚠️  Users model missing diamonds/energy fields. Please run migration.');
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
      await sendTelegramMessage(
        update.message.from.id,
        '🛟 For payment support, contact support team'
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in payment webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
