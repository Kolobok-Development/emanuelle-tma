import { prisma } from "@/core/db/prisma";
import { COOKIE_NAME, decrypt } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";
import { OfferType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // JWT Authentication
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Verify JWT and check if session exists in database
    try {
      await decrypt(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    const session = await prisma.session.findFirst({
      where: { token },
    });

    if (!session || session.expires_at < new Date()) {
      return NextResponse.json(
        { error: 'Session expired or not found' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as OfferType | null;
    const active = searchParams.get('active');

    // Build where clause
    const where: {
      offer_type?: OfferType;
      is_active?: boolean;
    } = {};

    if (type && ['COMBO', 'ENERGY', 'DIAMOND'].includes(type)) {
      where.offer_type = type;
    }

    if (active !== null) {
      where.is_active = active === 'true';
    } else {
      // Default to active offers only if not specified
      where.is_active = true;
    }

    // Fetch offers from database
    const offers = await prisma.offers.findMany({
      where,
      orderBy: [
        { offer_type: 'asc' },
        { display_order: 'asc' },
      ],
    });

    // Format response
    const formattedOffers = offers.map((offer) => ({
      id: offer.id,
      offer_type: offer.offer_type,
      title: offer.title,
      description: offer.description,
      price_in_stars: offer.price_in_stars,
      price_in_usd: Number(offer.price_in_usd),
      diamonds: offer.diamonds,
      energy: offer.energy,
      display_order: offer.display_order,
      is_active: offer.is_active,
    }));

    return NextResponse.json({
      success: true,
      offers: formattedOffers,
    });

  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

