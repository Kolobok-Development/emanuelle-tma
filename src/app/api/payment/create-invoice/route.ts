import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try{
        console.log('Creating invoice - starting...');
        
        const session = await getServerSession(request);
        console.log('Session:', session ? 'found' : 'not found');

        if (!session) {
            console.error('No session found');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        console.log('Request body:', { offerId: body.offerId });

        const userId = session.user.id;
        const { offerId } = body;

        if (!offerId || !userId) {
            console.error('Missing offerId or userId:', { offerId, userId });
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400 }
            );
        }

        console.log('Fetching offer...');
        const offer = await prisma.offers.findUnique({
            where: { id: offerId, is_active: true },
        });

        if (!offer) {
            console.error('Offer not found:', offerId);
            return NextResponse.json(
                { error: 'Offer not found' },
                { status: 404 }
            );
        }

        console.log('Offer found:', offer.title);
        const { title, description, price_in_stars, price_in_usd } = offer;

        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not found in environment');
            return NextResponse.json(
                { error: 'Telegram bot token not found' },
                { status: 500 }
            );
        }

        // Generate a unique requestId using the crypto module
        const requestId = crypto.randomUUID();
        console.log('Creating transaction with requestId:', requestId);

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

        console.log('Transaction created, calling Telegram API...');
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                payload: offerId,
                provider_token: '',
                currency: 'XTR',
                prices: [{label: title, amount: price_in_stars}],
            }),
        });

        const invoice = await response.json();
        console.log('Telegram API response:', invoice);

        if (!invoice.ok) {
            console.error('Telegram API error:', invoice);
            return NextResponse.json(
                { error: 'Failed to create invoice', telegramError: invoice.description },
                { status: 500 }
            );
        }

        const invoiceLink = invoice.result;
        console.log('Invoice created successfully:', invoiceLink);

        return NextResponse.json({
            success: true,
            invoiceLink,
        });

    }catch(error){
        console.error("Error in create-invoice:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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