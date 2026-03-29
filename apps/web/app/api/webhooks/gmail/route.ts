import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@google-auto-work/db";
import { listHistory } from "@google-auto-work/google-client";
import { getUserAuth } from "@/lib/google-auth";
import { Queue } from "bullmq";
import IORedis from "ioredis";

// Gmail Pub/Sub push notification receiver
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Pub/Sub message format
    const message = body?.message;
    if (!message?.data) {
      return NextResponse.json({ ok: true }); // Acknowledge empty messages
    }

    const decoded = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    );
    const { emailAddress, historyId } = decoded;

    if (!emailAddress || !historyId) {
      return NextResponse.json({ ok: true });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: emailAddress },
      include: { oauthToken: true },
    });

    if (!user || !user.oauthToken) {
      return NextResponse.json({ ok: true });
    }

    // Get new message IDs from history
    const auth = await getUserAuth(user.id);
    const { messageIds } = await listHistory(auth, historyId);

    if (messageIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Enqueue email ingest jobs
    const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    const emailIngestQueue = new Queue("email-ingest", { connection });

    await emailIngestQueue.addBulk(
      messageIds.map((messageId) => ({
        name: "email-ingest",
        data: { userId: user.id, messageId },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        },
      }))
    );

    await emailIngestQueue.close();
    connection.disconnect();

    return NextResponse.json({ ok: true, queued: messageIds.length });
  } catch (err) {
    console.error("Gmail webhook error:", err);
    // Always return 200 to acknowledge Pub/Sub message
    return NextResponse.json({ ok: true });
  }
}
