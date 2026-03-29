import { Job } from "bullmq";
import { prisma } from "@google-auto-work/db";
import {
  getMessage,
  modifyLabels,
  archiveMessage,
  trashMessage,
  createDraft,
  getAuthenticatedClient,
} from "@google-auto-work/google-client";
import { analyzeEmail, generateAllDrafts } from "@google-auto-work/ai-client";
import { createEvent } from "@google-auto-work/google-client";
import { matchingRules, type RuleAction } from "./ruleProcessor.js";

export interface EmailIngestJobData {
  userId: string;
  messageId: string;
  triggerId?: string;
}

export async function processEmailJob(job: Job<EmailIngestJobData>) {
  const { userId, messageId, triggerId } = job.data;
  const startTime = Date.now();

  const token = await prisma.oAuthToken.findUnique({ where: { userId } });
  if (!token) throw new Error(`No token for user ${userId}`);

  const auth = await getAuthenticatedClient(
    token.accessTokenEnc,
    token.refreshTokenEnc,
    token.expiresAt
  );

  const email = await getMessage(auth, messageId);

  // Analyze email with Gemini
  const analysis = await analyzeEmail({
    subject: email.subject,
    from: email.from,
    body: email.body,
    date: email.date,
  });

  // Fetch active rules for user
  const dbRules = await prisma.automationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "asc" },
  });

  const rules = dbRules.map((r) => ({
    id: r.id,
    name: r.name,
    conditions: r.conditions as any,
    actions: r.actions as any,
    priority: r.priority,
  }));

  const matched = matchingRules(rules, email);

  const actionsExecuted: { action: string; result: string; durationMs: number }[] = [];
  let hasError = false;

  for (const rule of matched) {
    for (const action of rule.actions as RuleAction[]) {
      const actionStart = Date.now();
      try {
        await executeAction(auth, userId, email, analysis, action);
        actionsExecuted.push({
          action: `${rule.name}:${action.type}`,
          result: "success",
          durationMs: Date.now() - actionStart,
        });
      } catch (err: any) {
        hasError = true;
        actionsExecuted.push({
          action: `${rule.name}:${action.type}`,
          result: `error: ${err.message}`,
          durationMs: Date.now() - actionStart,
        });
      }
    }
  }

  // If AI suggests calendar event and no rule handled it, create it
  if (analysis.calendarEvent && matched.length === 0) {
    try {
      const ev = analysis.calendarEvent;
      await createEvent(auth, {
        title: ev.title,
        startDatetime: ev.startDatetime,
        endDatetime: ev.endDatetime,
        attendees: ev.attendees,
        location: ev.location,
      });
      actionsExecuted.push({
        action: "ai:createCalendarEvent",
        result: "success",
        durationMs: 0,
      });
    } catch {}
  }

  const status =
    actionsExecuted.length === 0
      ? "SKIPPED"
      : hasError
      ? actionsExecuted.some((a) => a.result === "success")
        ? "PARTIAL"
        : "FAILED"
      : "SUCCESS";

  await prisma.executionLog.create({
    data: {
      userId,
      triggerId,
      emailId: messageId,
      emailSubject: email.subject,
      emailFrom: email.from,
      status: status as any,
      actionsExecuted,
      durationMs: Date.now() - startTime,
    },
  });

  return { messageId, status, actionsExecuted };
}

async function executeAction(
  auth: any,
  userId: string,
  email: any,
  analysis: any,
  action: RuleAction
) {
  switch (action.type) {
    case "addLabel": {
      const labelId = action.params?.labelId as string;
      if (labelId) await modifyLabels(auth, email.id, [labelId], []);
      break;
    }
    case "removeLabel": {
      const labelId = action.params?.labelId as string;
      if (labelId) await modifyLabels(auth, email.id, [], [labelId]);
      break;
    }
    case "archive":
      await archiveMessage(auth, email.id);
      break;
    case "trash":
      await trashMessage(auth, email.id);
      break;
    case "createCalendarEvent":
      if (analysis.calendarEvent) {
        const ev = analysis.calendarEvent;
        await createEvent(auth, {
          title: ev.title,
          startDatetime: ev.startDatetime,
          endDatetime: ev.endDatetime,
          attendees: ev.attendees,
          location: ev.location,
        });
      }
      break;
    case "generateDraft": {
      const drafts = await generateAllDrafts(
        { subject: email.subject, from: email.from, body: email.body },
        analysis
      );
      // Save to DB
      await Promise.all(
        drafts.map((d) =>
          prisma.emailDraft.create({
            data: {
              userId,
              emailId: email.id,
              emailSubject: email.subject,
              emailFrom: email.from,
              style: d.style,
              draftContent: d.content,
            },
          })
        )
      );
      break;
    }
  }
}
