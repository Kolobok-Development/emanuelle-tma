import { prisma } from "@/core/db/prisma";
import { getServerSession } from "@/utils/sessions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await prisma.users.update({
      where: { id: userId },
      data: { onboarding_completed_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
