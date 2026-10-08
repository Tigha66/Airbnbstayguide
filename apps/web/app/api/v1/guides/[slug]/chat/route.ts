import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { chatSchema } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { parseJson, unavailable } from "@/lib/api";
import { aiAnswer, keywordAnswer, unknownAnswer, type ConciergeAnswer } from "@/lib/concierge";
import { detectLanguage } from "@/lib/language";
import { consumeAiUsage, consumeRateLimit, getPublishedProperty, saveMessages, threadBelongsTo } from "@/lib/repo";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Live concierge");
  const { slug } = await params;
  let body;
  try {
    body = chatSchema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ error: "Please type a question (up to 2,000 characters)." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = createHash("sha256").update(`${process.env.AUTH_SECRET ?? "stayguide"}:${ip}:${slug}`).digest("hex");
  if (!(await consumeRateLimit(bucket, 15, 60)))
    return NextResponse.json({ error: "Please wait a moment before asking again." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  if (!found) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  const threadId = body.threadId && (await threadBelongsTo(body.threadId, found.property.id)) ? body.threadId : crypto.randomUUID();
  // Reply in the language the guest actually wrote in; the guide's language menu is only a fallback.
  const language = detectLanguage(body.message) ?? body.language;
  let answer: ConciergeAnswer;
  let mode: "ai" | "keyword" = "keyword";
  if (aiConfigured() && (await consumeAiUsage(found.ownerId))) {
    try {
      answer = await aiAnswer(found.property, body.message, language);
      mode = "ai";
    } catch (error) {
      // Visible in Vercel → Logs; the guest still gets an answer from the keyword search.
      console.error("[concierge] AI answer failed; using keyword search", error);
      answer = keywordAnswer(found.property, body.message, language);
    }
  } else answer = keywordAnswer(found.property, body.message, language);
  if (!answer.answer) answer = unknownAnswer(language);
  await saveMessages(found.property.id, threadId, [
    { role: "guest", content: body.message, language },
    { role: "assistant", content: answer.answer, language, citations: answer.citations, escalated: answer.escalate },
  ]);
  return NextResponse.json({ ...answer, threadId, mode, language });
}
