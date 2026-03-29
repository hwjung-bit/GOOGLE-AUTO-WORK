import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmailAnalysis } from "./emailAnalyzer.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type DraftStyle = "formal" | "casual" | "concise";

export interface GeneratedDraft {
  style: DraftStyle;
  content: string;
}

const STYLE_INSTRUCTIONS: Record<DraftStyle, string> = {
  formal:
    "격식체(존댓말)로 작성. 정중하고 전문적인 어조. '안녕하십니까', '감사합니다' 등 격식 표현 사용. 단락 구분 명확히.",
  casual:
    "친근한 반말 또는 가벼운 존댓말로 작성. 자연스럽고 편안한 어조. 짧고 명확한 문장 사용.",
  concise:
    "핵심만 간결하게 작성. 3-5문장 이내. 불필요한 인사말 최소화. 요점만 직접적으로 전달.",
};

export async function generateDraft(
  email: {
    subject: string;
    from: string;
    body: string;
  },
  analysis: EmailAnalysis,
  style: DraftStyle
): Promise<GeneratedDraft> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `다음 이메일에 대한 답장 초안을 작성하세요.

원본 이메일:
발신자: ${email.from}
제목: ${email.subject}
내용: ${email.body.slice(0, 4000)}

이메일 분석:
- 주제: ${analysis.topic}
- 권장 행동: ${analysis.suggestedAction}
- 요약: ${analysis.summary}

작성 스타일: ${STYLE_INSTRUCTIONS[style]}

답장 초안만 작성하세요 (설명이나 메타 정보 없이 실제 이메일 내용만):`;

  const result = await model.generateContent(prompt);
  return {
    style,
    content: result.response.text().trim(),
  };
}

export async function generateAllDrafts(
  email: {
    subject: string;
    from: string;
    body: string;
  },
  analysis: EmailAnalysis
): Promise<GeneratedDraft[]> {
  const styles: DraftStyle[] = ["formal", "casual", "concise"];
  // Generate all 3 styles in parallel
  const drafts = await Promise.all(
    styles.map((style) => generateDraft(email, analysis, style))
  );
  return drafts;
}
