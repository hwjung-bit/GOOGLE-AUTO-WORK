import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getUserAuth } from "@/lib/google-auth";
import { listMessages, getMessage } from "@google-auto-work/google-client";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { searchParams } = new URL(req.url);

    const auth = await getUserAuth(userId);
    const { messages, nextPageToken } = await listMessages(auth, {
      maxResults: Number(searchParams.get("limit") ?? 20),
      pageToken: searchParams.get("pageToken") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    // Fetch message details in parallel (limit to avoid rate limiting)
    const details = await Promise.all(
      messages.slice(0, 10).map((m) => getMessage(auth, m.id))
    );

    return NextResponse.json({ emails: details, nextPageToken });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
