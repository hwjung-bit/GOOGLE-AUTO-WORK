import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";

export async function GET() {
  try {
    const { userId } = await requireSession();

    const [
      totalEmails,
      successCount,
      failedCount,
      totalDrafts,
      totalDocSummaries,
      activeRules,
    ] = await Promise.all([
      prisma.executionLog.count({ where: { userId } }),
      prisma.executionLog.count({ where: { userId, status: "SUCCESS" } }),
      prisma.executionLog.count({ where: { userId, status: "FAILED" } }),
      prisma.emailDraft.count({ where: { userId } }),
      prisma.documentSummary.count({ where: { userId } }),
      prisma.automationRule.count({ where: { userId, isActive: true } }),
    ]);

    return NextResponse.json({
      totalEmails,
      successCount,
      failedCount,
      successRate: totalEmails > 0 ? Math.round((successCount / totalEmails) * 100) : 0,
      totalDrafts,
      totalDocSummaries,
      activeRules,
    });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
