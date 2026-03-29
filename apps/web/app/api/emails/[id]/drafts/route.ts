import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getUserAuth } from "@/lib/google-auth";
import { prisma } from "@google-auto-work/db";
import { getMessage } from "@google-auto-work/google-client";
import { analyzeEmail, generateAllDrafts } from "@google-auto-work/ai-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id: messageId } = await params;
    const auth = await getUserAuth(userId);

    const email = await getMessage(auth, messageId);
    const analysis = await analyzeEmail({
      subject: email.subject,
      from: email.from,
      body: email.body,
      date: email.date,
    });

    const drafts = await generateAllDrafts(
      { subject: email.subject, from: email.from, body: email.body },
      analysis
    );

    // Persist drafts
    const saved = await Promise.all(
      drafts.map((d) =>
        prisma.emailDraft.create({
          data: {
            userId,
            emailId: messageId,
            emailSubject: email.subject,
            emailFrom: email.from,
            style: d.style,
            draftContent: d.content,
          },
        })
      )
    );

    return NextResponse.json({ drafts: saved, analysis });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireSession();
    const { id: messageId } = await params;

    const drafts = await prisma.emailDraft.findMany({
      where: { userId, emailId: messageId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
