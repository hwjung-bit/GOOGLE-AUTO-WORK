import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "./queues.js";
import { processEmailJob } from "./processors/emailProcessor.js";
import { processScheduledJob } from "./processors/scheduledProcessor.js";

const emailWorker = new Worker("email-ingest", processEmailJob, {
  connection,
  concurrency: 5,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

const scheduledWorker = new Worker("scheduled", processScheduledJob, {
  connection,
  concurrency: 2,
});

emailWorker.on("completed", (job) => {
  console.log(`[email-ingest] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[email-ingest] Job ${job?.id} failed:`, err.message);
});

scheduledWorker.on("completed", (job) => {
  console.log(`[scheduled] Job ${job.id} completed`);
});

scheduledWorker.on("failed", (job, err) => {
  console.error(`[scheduled] Job ${job?.id} failed:`, err.message);
});

console.log("Worker started. Waiting for jobs...");

process.on("SIGTERM", async () => {
  await emailWorker.close();
  await scheduledWorker.close();
  process.exit(0);
});
