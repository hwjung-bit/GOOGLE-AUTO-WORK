import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";

async function getRuleOrFail(userId: string, ruleId: string) {
  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, userId },
  });
  if (!rule) throw new Error("NOT_FOUND");
  return rule;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;
    const rule = await getRuleOrFail(userId, id);
    return NextResponse.json({ rule });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;
    await getRuleOrFail(userId, id);
    const body = await req.json();

    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        conditions: body.conditions,
        actions: body.actions,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ rule });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;
    await getRuleOrFail(userId, id);

    await prisma.automationRule.delete({ where: { id } });
    await prisma.accessLog.create({
      data: { userId, action: "rule_delete", metadata: { ruleId: id } },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
