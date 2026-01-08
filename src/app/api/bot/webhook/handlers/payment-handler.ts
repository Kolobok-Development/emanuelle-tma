import { NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { Prisma, PaymentStatus } from '@prisma/client';
import { BOT_TOKEN, sendTelegramMessage } from '../utils';
import { trackPayment, trackDBQuery } from '@/lib/metrics-helpers';


export async function handlePaymentWebhook(update: any): Promise<NextResponse> {
  globalThis?.logger?.info({}, 'Payment webhook received');

  if (!BOT_TOKEN) {
    globalThis?.logger?.error({}, 'Bot token not configured');
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  if (update.pre_checkout_query) {
    return await handlePreCheckoutQuery(update.pre_checkout_query);
  }

  if (update.message?.successful_payment) {
    return await handleSuccessfulPayment(update.message.successful_payment, update.message.from.id);
  }

  if (update.message?.text === '/paysupport') {
    globalThis?.logger?.info({ userId: update.message.from.id }, 'Handling /paysupport command');
    await sendTelegramMessage(
      update.message.from.id,
      '🛟 For payment support, contact support team'
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handlePreCheckoutQuery(preCheckoutQuery: any): Promise<NextResponse> {
  const { id: queryId, invoice_payload, total_amount, currency } = preCheckoutQuery;
  globalThis?.logger?.info({ queryId, invoice_payload, total_amount, currency }, 'Processing pre_checkout_query');

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
    
    // Track failed payment
    if (transaction?.offer) {
      trackPayment('failed', transaction.offer.offer_type || 'unknown');
    }
    
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

async function handleSuccessfulPayment(payment: any, userId: number): Promise<NextResponse> {
  const offerId = payment.invoice_payload; 
  
  globalThis?.logger?.info({ 
    userId,
    offerId,
    chargeId: payment.telegram_payment_charge_id,
    amount: payment.total_amount,
    currency: payment.currency
  }, 'Processing successful payment');
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

  if (transaction.invoice_id) {
    globalThis?.logger?.warn({ 
      chargeId: payment.telegram_payment_charge_id,
      invoiceId: transaction.invoice_id
    }, 'Payment already processed');
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.users.findUnique({
    where: { telegram_id: BigInt(userId) },
  });

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

  try {
    globalThis?.logger?.info({ transactionId: transaction.id }, 'Starting database transaction');
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.paymentTransactions.update({
        where: { id: transaction.id },
        data: {
          invoice_id: payment.telegram_payment_charge_id,
          status: PaymentStatus.COMPLETED,
          completed_at: new Date(),
        },
      });
      globalThis?.logger?.info({ transactionId: transaction.id }, 'Transaction updated successfully');

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

    globalThis?.logger?.info({ userId }, 'Sending confirmation message to user');
    await sendTelegramMessage(
      userId,
      `✅ Payment Successful!\n\n` +
      `Receipt ID: \`${payment.telegram_payment_charge_id}\``
    );

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
      }
    }, 'Payment processed successfully');
    
    // Track payment metrics
    const offerType = transaction.offer?.offer_type || 'unknown';
    const amountUSD = transaction.offer ? Number(transaction.offer.price_in_usd) : 0;
    trackPayment('success', offerType, amountUSD);
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    globalThis?.logger?.error({ 
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      transactionId: transaction.id
    }, 'Error processing payment');
    
    if (error.message?.includes('diamonds') || error.message?.includes('energy')) {
      globalThis?.logger?.error({ transactionId: transaction.id }, 'Users model missing diamonds/energy fields. Please run migration.');
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

