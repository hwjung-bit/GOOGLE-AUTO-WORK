import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getUserAuth } from "@/lib/google-auth";
import { prisma } from "@google-auto-work/db";
import { searchFiles, exportFileAsText } from "@google-auto-work/google-client";
import { summarizeDocument } from "@google-auto-work/ai-client";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { query, emailId, emailContext } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const auth = await getUserAuth(userId);
    const files = await searchFiles(auth, query, 5);

    const results = await Promise.all(
      files.map(async (file) => {
        // Check cache
        const cached = await prisma.documentSummary.findUnique({
          where: {
            userId_driveFileId_sourceEmailId: {
              userId,
              driveFileId: file.id,
              sourceEmailId: emailId ?? "",
            },
          },
        });

        if (cached) {
          return { file, summary: cached.summary, keyPoints: cached.keyPoints as string[] };
        }

        try {
          const content = await exportFileAsText(auth, file.id, file.mimeType);
          const summaryResult = await summarizeDocument(content, file.name, emailContext);

          await prisma.documentSummary.create({
            data: {
              userId,
              driveFileId: file.id,
              driveFileName: file.name,
              mimeType: file.mimeType,
              summary: summaryResult.summary,
              keyPoints: summaryResult.keyPoints,
              sourceEmailId: emailId ?? null,
            },
          });

          return { file, summary: summaryResult.summary, keyPoints: summaryResult.keyPoints };
        } catch {
          return { file, summary: "요약 생성 실패", keyPoints: [] };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
