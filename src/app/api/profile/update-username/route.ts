import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(request);
    if (!session) {
      globalThis?.logger?.warn({}, 'No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      globalThis?.logger?.warn({ userId }, 'Invalid username provided');
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    globalThis?.logger?.info({ userId, username: username.trim() }, 'Updating username');

    // Update user's conversation name (username field for now)
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { username: username.trim() },
    });

    globalThis?.logger?.info({ 
      userId,
      newUsername: updatedUser.username,
      duration: Date.now() - startTime
    }, 'Username updated successfully');

    return NextResponse.json({
      success: true,
      username: updatedUser.username,
    });
  } catch (error) {
    globalThis?.logger?.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    }, 'Error updating username');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

