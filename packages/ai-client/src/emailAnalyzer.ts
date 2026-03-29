import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface EmailAnalysis {
  topic: string;
  urgency: "high" | "medium" | "low";
  sentiment: "positive" | "neutral" | "negative";
  keyEntities: string[];
  suggestedAction: string;
  driveSearchQuery: string;
  requiresReply: boolean;
  calendarEvent?: {
    title: string;
    startDatetime: string;
    endDatetime: string;
    attendees: string[];
    location?: string;
  } | null;
  summary: string;
}

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    topic: { type: SchemaType.STRING },
    urgency: { type: SchemaType.STRING, enum: ["high", "medium", "low"] },
    sentiment: { type: SchemaType.STRING, enum: ["positive", "neutral", "negative"] },
    keyEntities: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    suggestedAction: { type: SchemaType.STRING },
    driveSearchQuery: { type: SchemaType.STRING },
    requiresReply: { type: SchemaType.BOOLEAN },
    calendarEvent: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        title: { type: SchemaType.STRING },
        startDatetime: { type: SchemaType.STRING },
        endDatetime: { type: SchemaType.STRING },
        attendees: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        location: { type: SchemaType.STRING, nullable: true },
      },
      required: ["title", "startDatetime", "endDatetime", "attendees"],
    },
    summary: { type: SchemaType.STRING },
  },
  required: [
    "topic",
    "urgency",
    "sentiment",
    "keyEntities",
    "suggestedAction",
    "driveSearchQuery",
    "requiresReply",
    "summary",
  ],
};

export async function analyzeEmail(email: {
  subject: string;
  from: string;
  body: string;
  date: string;
}): Promise<EmailAnalysis> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
    },
  });

  const prompt = `이메일을 분석하고 구조화된 정보를 추출하세요.

발신자: ${email.from}
날짜: ${email.date}
제목: ${email.subject}
본문:
${email.body.slice(0, 8000)}

분석 지침:
- topic: 이메일의 핵심 주제 (한국어로 간결하게)
- urgency: 긴급도 (high=즉시 대응 필요, medium=오늘 내 처리, low=여유 있음)
- sentiment: 발신자의 감정 톤
- keyEntities: 중요 인물/조직/프로젝트/날짜 등 핵심 엔티티 목록
- suggestedAction: 권장 다음 행동 (한국어)
- driveSearchQuery: 이 이메일과 관련된 구글 드라이브 파일 검색에 사용할 영어 키워드 (2-4단어)
- requiresReply: 답장이 필요한지 여부
- calendarEvent: 이메일에 회의/약속 관련 내용이 있으면 추출 (없으면 null), datetime은 ISO 8601 형식
- summary: 이메일 핵심 내용 2-3문장 요약 (한국어)`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as EmailAnalysis;
  } catch {
    throw new Error(`Failed to parse email analysis: ${text}`);
  }
}
