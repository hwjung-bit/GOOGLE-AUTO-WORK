import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";

// PUT /api/rules/reorder - body: { ids: string[] } (ordered list)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { ids } = await req.json() as { ids: string[] };

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.automationRule.updateMany({
          where: { id, userId },
          data: { priority: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
