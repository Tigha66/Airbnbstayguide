import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { chatSchema } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { parseJson, unavailable } from "@/lib/api";
import { aiAnswer, keywordAnswer, unknownAnswer, type ConciergeAnswer } from "@/lib/concierge";
import { consumeAiUsage, consumeRateLimit, getPublishedProperty, saveMessages, threadBelongsTo } from "@/lib/repo";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Live concierge");
  const { slug } = await params;
  let body;
  try {
    body = chatSchema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ error: "Please type a shorter question." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = createHash("sha256").update(`${process.env.AUTH_SECRET ?? "stayguide"}:${ip}:${slug}`).digest("hex");
  if (!(await consumeRateLimit(bucket, 15, 60)))
    return NextResponse.json({ error: "Please wait a moment before asking again." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  if (!found) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  const threadId = body.threadId && (await threadBelongsTo(body.threadId, found.property.id)) ? body.threadId : crypto.randomUUID();
  let answer: ConciergeAnswer;
  let mode: "ai" | "keyword" = "keyword";
  if (aiConfigured() && (await consumeAiUsage(found.ownerId))) {
    try {
      answer = await aiAnswer(found.property, body.message, body.language);
      mode = "ai";
    } catch {
      answer = keywordAnswer(found.property, body.message, body.language);
    }
  } else answer = keywordAnswer(found.property, body.message, body.language);
  if (!answer.answer) answer = unknownAnswer(body.language);
  await saveMessages(found.property.id, threadId, [
    { role: "guest", content: body.message, language: body.language },
    { role: "assistant", content: answer.answer, language: body.language, citations: answer.citations, escalated: answer.escalate },
  ]);
  return NextResponse.json({ ...answer, threadId, mode });
}
