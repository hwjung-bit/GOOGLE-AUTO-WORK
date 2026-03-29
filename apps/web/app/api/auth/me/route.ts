import { NextResponse } from "next/server";
import { prisma } from "@google-auto-work/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const token = await prisma.oAuthToken.findUnique({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });

    return NextResponse.json({
      id: user?.id,
      email: user?.email,
      name: user?.name,
      hasToken: !!token,
      tokenScope: token?.scope,
      tokenExpiresAt: token?.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
