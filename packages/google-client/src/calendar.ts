import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface CalendarEventInput {
  title: string;
  description?: string;
  startDatetime: string; // ISO 8601
  endDatetime: string;   // ISO 8601
  timezone?: string;
  attendees?: string[];
  location?: string;
}

export interface CalendarEvent {
  id: string;
  htmlLink: string;
  title: string;
  startDatetime: string;
  endDatetime: string;
}

export async function createEvent(
  auth: OAuth2Client,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const calendar = google.calendar({ version: "v3", auth });
  const tz = input.timezone ?? "Asia/Seoul";

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: input.startDatetime, timeZone: tz },
      end: { dateTime: input.endDatetime, timeZone: tz },
      attendees: input.attendees?.map((email) => ({ email })),
    },
  });

  return {
    id: res.data.id!,
    htmlLink: res.data.htmlLink!,
    title: res.data.summary!,
    startDatetime: res.data.start?.dateTime!,
    endDatetime: res.data.end?.dateTime!,
  };
}

export async function listUpcomingEvents(
  auth: OAuth2Client,
  maxResults = 10
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map((e) => ({
    id: e.id!,
    htmlLink: e.htmlLink!,
    title: e.summary ?? "(제목 없음)",
    startDatetime: e.start?.dateTime ?? e.start?.date ?? "",
    endDatetime: e.end?.dateTime ?? e.end?.date ?? "",
  }));
}
