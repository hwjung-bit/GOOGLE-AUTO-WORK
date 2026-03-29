import { Job } from "bullmq";
import { prisma } from "@google-auto-work/db";
import {
  listMessages,
  getAuthenticatedClient,
} from "@google-auto-work/google-client";
import { emailIngestQueue } from "../queues.js";

export interface ScheduledJobData {
  userId: string;
  triggerId: string;
  hoursBack?: number;
}

export async function processScheduledJob(job: Job<ScheduledJobData>) {
  const { userId, triggerId, hoursBack = 24 } = job.data;

  const token = await prisma.oAuthToken.findUnique({ where: { userId } });
  if (!token) throw new Error(`No token for user ${userId}`);

  const auth = await getAuthenticatedClient(
    token.accessTokenEnc,
    token.refreshTokenEnc,
    token.expiresAt
  );

  // Fetch emails from last N hours
  const after = Math.floor((Date.now() - hoursBack * 3_600_000) / 1000);
  const { messages } = await listMessages(auth, {
    q: `after:${after} in:inbox`,
    maxResults: 50,
  });

  // Enqueue each email for processing
  const jobs = messages.map((msg) => ({
    name: "email-ingest",
    data: { userId, messageId: msg.id, triggerId },
    opts: { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  }));

  if (jobs.length > 0) {
    await emailIngestQueue.addBulk(jobs);
  }

  // Update trigger last fired
  await prisma.automationTrigger.update({
    where: { id: triggerId },
    data: { lastFiredAt: new Date() },
  });

  return { processed: messages.length };
}
