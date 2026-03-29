import { prisma } from "@google-auto-work/db";
import {
  encryptToken,
  getAuthenticatedClient,
} from "@google-auto-work/google-client";
import type { OAuth2Client } from "google-auth-library";

export async function getUserAuth(userId: string): Promise<OAuth2Client> {
  const token = await prisma.oAuthToken.findUnique({ where: { userId } });
  if (!token) throw new Error("No OAuth token found for user");

  const client = await getAuthenticatedClient(
    token.accessTokenEnc,
    token.refreshTokenEnc,
    token.expiresAt
  );

  // Persist refreshed token if credentials changed
  const creds = client.credentials;
  if (creds.access_token) {
    await prisma.oAuthToken.update({
      where: { userId },
      data: {
        accessTokenEnc: encryptToken(creds.access_token),
        expiresAt: new Date(creds.expiry_date ?? Date.now() + 3_600_000),
      },
    });
  }

  return client;
}
