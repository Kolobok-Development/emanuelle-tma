import { prisma } from "@/core/db/prisma";
import { COOKIE_NAME, decrypt } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) { 
    try {
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

        const session = await prisma.session.findFirstOrThrow({
            where: { token },
            include: { user: { include: { settings: true } } }
        });


        if (!session || session.expires_at < new Date()) {
            return NextResponse.json(
              { error: 'Session expired or not found' },
              { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
              id: session.user.id,
              telegram_id: Number(session.user.telegram_id),
              username: session.user.username,
              settings: session.user.settings,
              diamonds: session.user.diamonds,
              energy: session.user.energy,
              gender: session.user.gender,
            },
            session: {
              expires_at: session.expires_at
            }
          });

    }catch (error) {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
    }
}