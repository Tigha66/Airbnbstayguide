import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { chatSchema, demoProperties, plans } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiAvailable, noteAiFailure, runWithAllowance } from "@/lib/ai-budget";
import { parseJson, unavailable } from "@/lib/api";
import { aiAnswer, keywordAnswer, unknownAnswer, type ConciergeAnswer } from "@/lib/concierge";
import { detectLanguage } from "@/lib/language";
import { notifyEscalation } from "@/lib/notify";
import { consumeRateLimit, getPublishedProperty, ownerPlan, saveMessages, threadBelongsTo, threadMessages } from "@/lib/repo";
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
  // Burst limit (15 a minute) and a daily cap per visitor per guide (60 a day).
  if (!(await consumeRateLimit(bucket, 15, 60)) || !(await consumeRateLimit(`day:${bucket}`, 60, 86400)))
    return NextResponse.json({ error: "Please wait a moment before asking again." }, { status: 429 });
  // Public sample guides (the website's "Guest demo") answer with the real AI too, within a
  // per-visitor limit and a global daily cap; nothing is saved because they have no owner.
  const sample = demoProperties.find((p) => p.slug === slug);
  if (sample) {
    const language = detectLanguage(body.message) ?? body.language;
    const useAi =
      (await aiAvailable()) &&
      (await consumeRateLimit(`ai-visitor:${bucket}`, 10, 86400)) &&
      (await consumeRateLimit("ai-demo-global", 300, 86400));
    let answer: ConciergeAnswer | null = null;
    let mode: "ai" | "keyword" = "keyword";
    if (useAi) {
      try {
        answer = await aiAnswer(sample, body.message, language, body.history ?? []);
        mode = "ai";
      } catch (error) {
        await noteAiFailure(error);
      }
    }
    answer ??= keywordAnswer(sample, body.message, language);
    if (!answer.answer) answer = unknownAnswer(language);
    return NextResponse.json({ ...answer, mode, language, sample: true });
  }
  const found = await getPublishedProperty(slug);
  if (!found) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  const existingThread = Boolean(body.threadId && (await threadBelongsTo(body.threadId, found.property.id)));
  const threadId = existingThread ? body.threadId! : crypto.randomUUID();
  // The conversation so far, so the concierge understands follow-up questions.
  const history = existingThread ? await threadMessages(found.property.id, threadId).catch(() => []) : [];
  // Reply in the language the guest actually wrote in; the guide's language menu is only a fallback.
  const language = detectLanguage(body.message) ?? body.language;
  let answer: ConciergeAnswer | null = null;
  let mode: "ai" | "keyword" = "keyword";
  // Nobody can drain a host's monthly allowance: at most 10 AI answers per visitor per guide per
  // day, and per guide per day a tenth of the plan's monthly messages. Past either cap, or while the
  // provider is paused, answers come from the keyword search, which costs the host nothing.
  if (await aiAvailable()) {
    const perGuideDaily = Math.max(1, Math.ceil(plans[await ownerPlan(found.ownerId)].messages / 10));
    const withinCaps =
      (await consumeRateLimit(`ai-visitor:${bucket}`, 10, 86400)) &&
      (await consumeRateLimit(`ai-guide:${found.property.id}`, perGuideDaily, 86400));
    if (withinCaps) {
      // Charged only when the AI actually answers (a failed call is given back).
      const run = await runWithAllowance(found.ownerId, 1, () => aiAnswer(found.property, body.message, language, history));
      if (run.ok) {
        answer = run.value;
        mode = "ai";
      }
    }
  }
  answer ??= keywordAnswer(found.property, body.message, language);
  if (!answer.answer) answer = unknownAnswer(language);
  await saveMessages(found.property.id, threadId, [
    { role: "guest", content: body.message, language },
    { role: "assistant", content: answer.answer, language, citations: answer.citations, escalated: answer.escalate },
  ]);
  // Handed over to the host: email them (at most once per conversation per 10 minutes). The guest
  // is told "your host has been notified" only when the host actually gets emails.
  const hostNotified = answer.escalate
    ? await notifyEscalation({ ownerId: found.ownerId, threadId, propertyName: found.property.name, question: body.message, language }).catch(() => false)
    : false;
  return NextResponse.json({ ...answer, threadId, mode, language, hostNotified });
}
