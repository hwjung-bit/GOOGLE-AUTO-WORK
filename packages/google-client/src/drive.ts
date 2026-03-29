import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const EXPORTABLE_MIME_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

export async function searchFiles(
  auth: OAuth2Client,
  query: string,
  maxResults = 5
): Promise<DriveFile[]> {
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    pageSize: maxResults,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
  });

  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime ?? undefined,
    webViewLink: f.webViewLink ?? undefined,
  }));
}

export async function exportFileAsText(
  auth: OAuth2Client,
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  const exportMimeType = EXPORTABLE_MIME_TYPES[mimeType];

  if (exportMimeType) {
    // Google Workspace files: export
    const res = await drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: "text" }
    );
    return (res.data as string).slice(0, 50_000); // limit to 50k chars
  } else {
    // Binary files: get content as text if possible
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    const text = res.data as string;
    return text.slice(0, 50_000);
  }
}
