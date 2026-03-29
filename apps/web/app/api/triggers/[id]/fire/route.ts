import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const trigger = await prisma.automationTrigger.findFirst({
      where: { id, userId },
    });
    if (!trigger) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    const scheduledQueue = new Queue("scheduled", { connection });

    const job = await scheduledQueue.add("manual-trigger", {
      userId,
      triggerId: id,
      hoursBack: 24,
    });

    await scheduledQueue.close();
    connection.disconnect();

    await prisma.automationTrigger.update({
      where: { id },
      data: { lastFiredAt: new Date() },
    });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
