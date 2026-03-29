import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  encryptToken,
  createOAuth2Client,
} from "@google-auto-work/google-client";
import { prisma } from "@google-auto-work/db";
import { getSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  const session = await getSession();
  const storedState = (session as any).oauthState;
  if (state && storedState && state !== storedState) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Get user info from Google
    const authClient = createOAuth2Client();
    authClient.setCredentials({ access_token: tokens.accessToken });
    const oauth2 = google.oauth2({ version: "v2", auth: authClient });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.id || !userInfo.email) {
      throw new Error("Failed to get user info");
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { googleId: userInfo.id },
      create: {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name ?? null,
      },
      update: {
        email: userInfo.email,
        name: userInfo.name ?? null,
      },
    });

    // Store encrypted tokens
    await prisma.oAuthToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessTokenEnc: encryptToken(tokens.accessToken),
        refreshTokenEnc: encryptToken(tokens.refreshToken),
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessTokenEnc: encryptToken(tokens.accessToken),
        refreshTokenEnc: encryptToken(tokens.refreshToken),
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
      },
    });

    // Log access
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        action: "oauth_grant",
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
        metadata: { scope: tokens.scope },
      },
    });

    // Set session
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name ?? undefined;
    delete (session as any).oauthState;
    await session.save();

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
  }
}
