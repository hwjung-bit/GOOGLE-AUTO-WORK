import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// SSE endpoint for real-time dashboard updates
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireSession();

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const sendEvent = (event: string, data: unknown) => {
          if (closed) return;
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent("connected", { userId, timestamp: new Date().toISOString() });

        // Poll for new execution logs every 5 seconds
        const interval = setInterval(async () => {
          if (closed) {
            clearInterval(interval);
            return;
          }
          try {
            const { prisma } = await import("@google-auto-work/db");
            const recentLog = await prisma.executionLog.findFirst({
              where: {
                userId,
                createdAt: { gte: new Date(Date.now() - 6000) },
              },
              orderBy: { createdAt: "desc" },
            });

            if (recentLog) {
              sendEvent("execution", {
                id: recentLog.id,
                status: recentLog.status,
                emailSubject: recentLog.emailSubject,
                emailFrom: recentLog.emailFrom,
                durationMs: recentLog.durationMs,
                createdAt: recentLog.createdAt,
              });
            }
          } catch {}
        }, 5000);

        // Heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          if (closed) {
            clearInterval(heartbeat);
            return;
          }
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 30_000);

        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(interval);
          clearInterval(heartbeat);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}
