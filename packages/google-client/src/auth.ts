import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!; // 32-byte hex string

function getKeyBuffer(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = getKeyBuffer();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv(12):authTag(16):ciphertext (all base64)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptToken(ciphertext: string): string {
  const key = getKeyBuffer();
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getAuthUrl(state?: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
      "profile",
    ],
    state,
  });
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing tokens in OAuth response");
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
    scope: tokens.scope ?? "",
  };
}

export async function getAuthenticatedClient(
  accessTokenEnc: string,
  refreshTokenEnc: string,
  expiresAt: Date
): Promise<OAuth2Client> {
  const client = createOAuth2Client();
  const accessToken = decryptToken(accessTokenEnc);
  const refreshToken = decryptToken(refreshTokenEnc);

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt.getTime(),
  });

  // Auto-refresh if expiring within 5 minutes
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
  }

  return client;
}

export async function revokeToken(accessTokenEnc: string): Promise<void> {
  const client = createOAuth2Client();
  const accessToken = decryptToken(accessTokenEnc);
  await client.revokeToken(accessToken);
}
