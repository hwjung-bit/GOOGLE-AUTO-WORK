import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface DocumentSummaryResult {
  summary: string;
  keyPoints: string[];
  relevanceNote?: string;
}

export async function summarizeDocument(
  fileContent: string,
  fileName: string,
  emailContext?: string
): Promise<DocumentSummaryResult> {
  // Use gemini-2.5-pro for documents due to large context window
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const contextPart = emailContext
    ? `\n참고 이메일 맥락:\n${emailContext.slice(0, 2000)}\n`
    : "";

  const prompt = `다음 문서를 분석하고 핵심 내용을 요약하세요.

파일명: ${fileName}
${contextPart}
문서 내용:
${fileContent.slice(0, 100_000)}

다음 형식으로 응답하세요 (JSON):
{
  "summary": "문서의 핵심 내용을 3-5문장으로 요약 (한국어)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3", ...],
  "relevanceNote": "이메일 맥락과의 연관성 (이메일 맥락이 있는 경우에만, 없으면 null)"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]) as DocumentSummaryResult;
  } catch {
    // Fallback: return raw text as summary
    return {
      summary: text.slice(0, 500),
      keyPoints: [],
    };
  }
}
