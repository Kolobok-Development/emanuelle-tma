import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Update user's conversation name (username field for now)
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { username: username.trim() },
    });

    return NextResponse.json({
      success: true,
      username: updatedUser.username,
    });
  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

