import { NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { Prisma, PaymentStatus } from '@prisma/client';
import { BOT_TOKEN, sendTelegramMessage } from '../utils';

export async function handlePaymentWebhook(update: any): Promise<NextResponse> {
  const timestamp = new Date().toISOString();
  console.log(`\n🔔 [${timestamp}] Payment webhook received`);

  if (!BOT_TOKEN) {
    console.error('❌ Bot token not configured');
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
  }

  if (update.pre_checkout_query) {
    return await handlePreCheckoutQuery(update.pre_checkout_query);
  }

  if (update.message?.successful_payment) {
    return await handleSuccessfulPayment(update.message.successful_payment, update.message.from.id);
  }

  if (update.message?.text === '/paysupport') {
    console.log('🛟 Handling /paysupport command');
    await sendTelegramMessage(
      update.message.from.id,
      '🛟 For payment support, contact support team'
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handlePreCheckoutQuery(preCheckoutQuery: any): Promise<NextResponse> {
  console.log('💳 Processing pre_checkout_query...');
  const { id: queryId, invoice_payload, total_amount, currency } = preCheckoutQuery;
  console.log(`   Query ID: ${queryId}`);
  console.log(`   Invoice Payload (request_id): ${invoice_payload}`);
  console.log(`   Total Amount: ${total_amount}`);
  console.log(`   Currency: ${currency}`);

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

  console.log(`🔍 Looking up transaction for offerId: ${invoice_payload}`);
  const transaction = await prisma.paymentTransactions.findFirst({
    where: {
      payload: { contains: invoice_payload },
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

async function handleSuccessfulPayment(payment: any, userId: number): Promise<NextResponse> {
  console.log('💰 Processing successful payment...');
  const offerId = payment.invoice_payload; 
  
  console.log(`   User ID: ${userId}`);
  console.log(`   Offer ID (invoice_payload): ${offerId}`);
  console.log(`   Payment Charge ID: ${payment.telegram_payment_charge_id}`);
  console.log(`   Total Amount: ${payment.total_amount}`);
  console.log(`   Currency: ${payment.currency}`);

  console.log(`🔍 Looking up transaction for offerId: ${offerId}`);
  const transaction = await prisma.paymentTransactions.findFirst({
    where: {
      payload: { contains: offerId },
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

  if (transaction.invoice_id) {
    console.log(`⚠️  Payment ${payment.telegram_payment_charge_id} already processed (invoice_id: ${transaction.invoice_id})`);
    return NextResponse.json({ ok: true });
  }

  console.log(`🔍 Looking up user for telegram_id: ${userId}`);
  const user = await prisma.users.findUnique({
    where: { telegram_id: BigInt(userId) },
  });

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

  try {
    console.log('💾 Starting database transaction...');
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    console.log(`📤 Sending confirmation message to user ${userId}`);
    await sendTelegramMessage(
      userId,
      `✅ Payment Successful!\n\n` +
      `Receipt ID: \`${payment.telegram_payment_charge_id}\``
    );

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
    
    if (error.message?.includes('diamonds') || error.message?.includes('energy')) {
      console.error('⚠️  Users model missing diamonds/energy fields. Please run migration.');
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

