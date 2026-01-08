import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let promocode: string | undefined;
  
  try {
    const session = await getServerSession(request);
    if (!session) {
      globalThis?.logger?.warn({}, 'No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    userId = session.user.id;
    const body = await request.json();
    promocode = body.promocode;
    
    globalThis?.logger?.info({ userId, promocode }, 'Applying promocode');

    // Validate input
    if (!promocode || typeof promocode !== 'string' || promocode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Promocode is required' },
        { status: 400 }
      );
    }

    const code = promocode.trim().toUpperCase();

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if promocode exists
      const promocodeRecord = await tx.promocodes.findUnique({
        where: { code },
      });

      if (!promocodeRecord) {
        throw new Error('INVALID_CODE');
      }

      // 2. Check if promocode is active
      if (!promocodeRecord.is_active) {
        throw new Error('INACTIVE_CODE');
      }

      // 3. Check if promocode is expired
      const now = new Date();
      if (promocodeRecord.expires_at && promocodeRecord.expires_at < now) {
        throw new Error('EXPIRED_CODE');
      }

      // 4. Check if user has already used this promocode
      const existingUsage = await tx.promocodeUsage.findUnique({
        where: {
          promocode_id_user_id: {
            promocode_id: promocodeRecord.id,
            user_id: userId,
          },
        },
      });

      if (existingUsage) {
        throw new Error('ALREADY_USED');
      }

      // 5. Check if usage limit has been reached
      if (promocodeRecord.usage_limit !== null) {
        const usageCount = await tx.promocodeUsage.count({
          where: {
            promocode_id: promocodeRecord.id,
          },
        });

        if (usageCount >= promocodeRecord.usage_limit) {
          throw new Error('USAGE_LIMIT_REACHED');
        }
      }

      // 6. Apply rewards and create usage record atomically
      const [updatedUser] = await Promise.all([
        // Update user's diamonds and energy
        tx.users.update({
          where: { id: userId },
          data: {
            diamonds: { increment: promocodeRecord.diamonds },
            energy: { increment: promocodeRecord.energy },
          },
        }),
        // Create usage record
        tx.promocodeUsage.create({
          data: {
            promocode_id: promocodeRecord.id,
            user_id: userId,
            used_at: now,
          },
        }),
      ]);

      return {
        diamonds: promocodeRecord.diamonds,
        energy: promocodeRecord.energy,
        newBalance: {
          diamonds: updatedUser.diamonds,
          energy: updatedUser.energy,
        },
      };
    });

    // Success response
    globalThis?.logger?.info({ 
      userId,
      promocode,
      rewards: result,
      duration: Date.now() - startTime
    }, 'Promocode applied successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Promocode applied successfully!',
      rewards: {
        diamonds: result.diamonds,
        energy: result.energy,
      },
      balance: result.newBalance,
    });
  } catch (error: any) {
    globalThis?.logger?.error({ 
      error: error.message,
      userId,
      promocode,
      duration: Date.now() - startTime
    }, 'Error applying promocode');

    // Handle specific error cases
    if (error.message === 'INVALID_CODE') {
      return NextResponse.json(
        { error: 'Invalid promocode' },
        { status: 400 }
      );
    }

    if (error.message === 'INACTIVE_CODE') {
      return NextResponse.json(
        { error: 'This promocode is no longer active' },
        { status: 400 }
      );
    }

    if (error.message === 'EXPIRED_CODE') {
      return NextResponse.json(
        { error: 'This promocode has expired' },
        { status: 400 }
      );
    }

    if (error.message === 'ALREADY_USED') {
      return NextResponse.json(
        { error: 'You have already used this promocode' },
        { status: 400 }
      );
    }

    if (error.message === 'USAGE_LIMIT_REACHED') {
      return NextResponse.json(
        { error: 'This promocode has reached its usage limit' },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violation (race condition)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already used this promocode' },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

