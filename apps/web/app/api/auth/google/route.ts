import { NextResponse } from "next/server";
import { getAuthUrl } from "@google-auto-work/google-client";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/session";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const session = await getSession();
  // Store state in session to prevent CSRF
  (session as any).oauthState = state;
  await session.save();

  const url = getAuthUrl(state);
  return NextResponse.redirect(url);
}
