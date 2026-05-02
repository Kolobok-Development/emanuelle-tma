import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { PaymentStatus, AppScope } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getBotTokenForCompanion, getMainBotToken } from "@/lib/telegram-tenant";


export async function POST(request: NextRequest) {
    const startTime = Date.now();
    try{
        const session = await getServerSession(request);

        if (!session) {
            globalThis?.logger?.warn({}, 'No session found');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const userId = session.user.id;
        const { offerId } = body;

        if (!offerId || !userId) {
            globalThis?.logger?.warn({ offerId, userId }, 'Missing offerId or userId');
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400 }
            );
        }

        globalThis?.logger?.info({ userId, offerId }, 'Creating invoice');

        const offer = await prisma.offers.findUnique({
            where: { id: offerId, is_active: true },
        });

        if (!offer) {
            globalThis?.logger?.warn({ userId, offerId }, 'Offer not found');
            return NextResponse.json(
                { error: 'Offer not found' },
                { status: 404 }
            );
        }

        const { title, description, price_in_stars, price_in_usd } = offer;

        let BOT_TOKEN: string | undefined;
        if (session.app_scope === AppScope.dedicated && session.locked_companion_id) {
            BOT_TOKEN = await getBotTokenForCompanion(session.locked_companion_id);
        } else {
            BOT_TOKEN = getMainBotToken();
        }

        if (!BOT_TOKEN) {
            globalThis?.logger?.error({}, 'Telegram bot token not found for session scope');
            return NextResponse.json(
                { error: 'Telegram bot token not found' },
                { status: 500 }
            );
        }

        // Generate a unique requestId using the crypto module combined with date
        const requestId = `${Date.now()}-${crypto.randomUUID()}`;

        await prisma.paymentTransactions.create({
            data: {
                user_id: userId,
                offer_id: offerId,
                amount: price_in_stars,
                amount_in_usd: price_in_usd,
                status: PaymentStatus.PENDING,
                payload: JSON.stringify({
                    requestId,
                }),
                updated_at: new Date(),
            },
        });

        globalThis?.logger?.info({ userId, offerId, requestId, amount: price_in_stars }, 'Transaction created, calling Telegram API');
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                payload: requestId,
                provider_token: '',
                currency: 'XTR',
                prices: [{label: title, amount: price_in_stars}],
            }),
        });

        const invoice = await response.json();

        if (!invoice.ok) {
            globalThis?.logger?.error({ 
                userId, 
                offerId, 
                telegramError: invoice.description 
            }, 'Telegram API error');
            return NextResponse.json(
                { error: 'Failed to create invoice', telegramError: invoice.description },
                { status: 500 }
            );
        }

        const invoiceLink = invoice.result;
        globalThis?.logger?.info({ 
            userId, 
            offerId, 
            requestId,
            duration: Date.now() - startTime
        }, 'Invoice created successfully');

        return NextResponse.json({
            success: true,
            invoiceLink,
        });

    }catch(error){
        globalThis?.logger?.error({ 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: Date.now() - startTime
        }, 'Error creating invoice');
        return NextResponse.json(
            { 
                error: "Internal server error", 
                details: error instanceof Error ? error.message : String(error),
                stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}