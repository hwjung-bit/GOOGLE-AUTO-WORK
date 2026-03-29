import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
}

export interface EmailListOptions {
  maxResults?: number;
  pageToken?: string;
  q?: string;
  labelIds?: string[];
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function listMessages(
  auth: OAuth2Client,
  options: EmailListOptions = {}
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string }> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults ?? 20,
    pageToken: options.pageToken,
    q: options.q,
    labelIds: options.labelIds,
  });

  return {
    messages: (res.data.messages ?? []) as { id: string; threadId: string }[],
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}

export async function getMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<EmailMessage> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = res.data;
  const headers = msg.payload?.headers ?? [];

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    subject: getHeader(headers, "subject"),
    from: getHeader(headers, "from"),
    to: getHeader(headers, "to"),
    date: getHeader(headers, "date"),
    snippet: msg.snippet ?? "",
    body: extractBody(msg.payload),
    labelIds: msg.labelIds ?? [],
  };
}

export async function createDraft(
  auth: OAuth2Client,
  options: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<string> {
  const gmail = google.gmail({ version: "v1", auth });

  const headers = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : null,
    options.references ? `References: ${options.references}` : null,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = Buffer.from(`${headers}\r\n\r\n${options.body}`).toString("base64url");

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw,
        threadId: options.threadId,
      },
    },
  });

  return res.data.id!;
}

export async function modifyLabels(
  auth: OAuth2Client,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<void> {
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds, removeLabelIds },
  });
}

export async function archiveMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<void> {
  await modifyLabels(auth, messageId, [], ["INBOX"]);
}

export async function trashMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<void> {
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.trash({ userId: "me", id: messageId });
}

export async function listLabels(
  auth: OAuth2Client
): Promise<{ id: string; name: string }[]> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.labels.list({ userId: "me" });
  return (res.data.labels ?? []).map((l) => ({ id: l.id!, name: l.name! }));
}

export async function watchMailbox(
  auth: OAuth2Client,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
    },
  });
  return {
    historyId: res.data.historyId!,
    expiration: res.data.expiration!,
  };
}

export async function listHistory(
  auth: OAuth2Client,
  startHistoryId: string
): Promise<{ messageIds: string[] }> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const messageIds: string[] = [];
  for (const record of res.data.history ?? []) {
    for (const msg of record.messagesAdded ?? []) {
      if (msg.message?.id) messageIds.push(msg.message.id);
    }
  }
  return { messageIds };
}
