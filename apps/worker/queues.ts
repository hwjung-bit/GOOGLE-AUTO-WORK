import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const emailIngestQueue = new Queue("email-ingest", { connection });
export const ruleActionQueue = new Queue("rule-action", { connection });
export const draftGenQueue = new Queue("draft-gen", { connection });
export const docSearchQueue = new Queue("doc-search", { connection });
export const scheduledQueue = new Queue("scheduled", { connection });
