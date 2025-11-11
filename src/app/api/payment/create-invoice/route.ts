import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try{

        const  session = await getServerSession(request);
        const body = await request.json();

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const { offerId } = body;


        if (!offerId || !userId) {
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400 }
            );
        }

        const offer = await prisma.offers.findUnique({
            where: { id: offerId, is_active: true },
        });

        if (!offer) {
            return NextResponse.json(
                { error: 'Offer not found' },
                { status: 404 }
            );
        }

        const { title, description, price_in_stars, price_in_usd } = offer;


        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!BOT_TOKEN) {
            return NextResponse.json(
                { error: 'Telegram bot token not found' },
                { status: 500 }
            );
        }

        // Generate a unique requestId using the crypto module
        const requestId = crypto.randomUUID();

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

        if (!invoice.ok) {
            return NextResponse.json(
                { error: 'Failed to create invoice' },
                { status: 500 }
            );
        }

        const invoiceLink = invoice.result;

        return NextResponse.json({
            success: true,
            invoiceLink,
        });


    }catch(error){
        console.error("Error in telegram-login:", error);
        return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
        );
    }
}