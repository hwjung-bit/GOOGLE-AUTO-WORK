import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@google-auto-work/db";
import { revokeToken } from "@google-auto-work/google-client";
import { requireSession, getSession } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireSession();

    const token = await prisma.oAuthToken.findUnique({ where: { userId } });
    if (token) {
      try {
        await revokeToken(token.accessTokenEnc);
      } catch {
        // Continue even if revocation fails (token may already be invalid)
      }
      await prisma.oAuthToken.delete({ where: { userId } });
    }

    await prisma.accessLog.create({
      data: {
        userId,
        action: "oauth_revoke",
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    const session = await getSession();
    session.destroy();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }
}
