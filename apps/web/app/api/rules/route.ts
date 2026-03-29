import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const rules = await prisma.automationRule.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });
    return NextResponse.json({ rules });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const body = await req.json();

    const { name, description, conditions, actions } = body;
    if (!name || !conditions || !actions) {
      return NextResponse.json({ error: "name, conditions, actions are required" }, { status: 400 });
    }

    // Get max priority
    const maxPriority = await prisma.automationRule.aggregate({
      where: { userId },
      _max: { priority: true },
    });

    const rule = await prisma.automationRule.create({
      data: {
        userId,
        name,
        description: description ?? null,
        conditions,
        actions,
        priority: (maxPriority._max.priority ?? -1) + 1,
      },
    });

    await prisma.accessLog.create({
      data: { userId, action: "rule_create", metadata: { ruleId: rule.id, ruleName: name } },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
