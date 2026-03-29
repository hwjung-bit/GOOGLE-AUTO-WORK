import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";
import { Queue } from "bullmq";
import IORedis from "ioredis";

function getConnection() {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}

export async function GET() {
  try {
    const { userId } = await requireSession();
    const triggers = await prisma.automationTrigger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ triggers });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const body = await req.json();
    const { name, triggerType, cronExpr, timezone, ruleIds } = body;

    if (!name || !triggerType) {
      return NextResponse.json({ error: "name, triggerType are required" }, { status: 400 });
    }

    const trigger = await prisma.automationTrigger.create({
      data: {
        userId,
        name,
        triggerType,
        cronExpr: cronExpr ?? null,
        timezone: timezone ?? "Asia/Seoul",
        ruleIds: ruleIds ?? [],
      },
    });

    // If scheduled, register BullMQ repeatable job
    if (triggerType === "SCHEDULED" && cronExpr) {
      const connection = getConnection();
      const scheduledQueue = new Queue("scheduled", { connection });

      const job = await scheduledQueue.add(
        "scheduled-trigger",
        { userId, triggerId: trigger.id },
        { repeat: { pattern: cronExpr, tz: timezone ?? "Asia/Seoul" } }
      );

      await prisma.automationTrigger.update({
        where: { id: trigger.id },
        data: { bullJobId: job.id ?? null },
      });

      await scheduledQueue.close();
      connection.disconnect();
    }

    return NextResponse.json({ trigger }, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
