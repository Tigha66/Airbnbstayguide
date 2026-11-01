import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { demoProperties, languages } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { unavailable } from "@/lib/api";
import { consumeRateLimit, getGuideTranslation, getPublishedProperty, saveGuideTranslation } from "@/lib/repo";
import { guideHash, guideLanguage, guideText, isTranslationComplete, translateGuideWithStatus } from "@/lib/translate";

export const dynamic = "force-dynamic";
// Translating a whole guide can take a little while the first time; afterwards it's cached.
export const maxDuration = 60;

/** GET ?lang=fr → the guide's text translated for guests (cached per guide version and language). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const language = new URL(request.url).searchParams.get("lang") ?? "";
  if (!(languages as readonly string[]).includes(language)) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

  const sample = demoProperties.find((p) => p.slug === slug);
  const found = sample ? null : dbConfigured() ? await getPublishedProperty(slug).catch(() => null) : null;
  const property = sample ?? found?.property;
  if (!property) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const text = guideText(property);
  // Already in the requested language: nothing to translate.
  if (guideLanguage(text) === language) return NextResponse.json({ translated: false, alreadyInLanguage: true });
  if (!aiConfigured() && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) return unavailable("Translation");

  const key = sample ? `sample:${slug}` : property.id;
  const hash = guideHash(text);
  if (dbConfigured()) {
    const cached = await getGuideTranslation(key, language, hash).catch(() => null);
    // Previously cached partial translations must be reattempted rather than shown as complete.
    if (cached && isTranslationComplete(text, cached)) return NextResponse.json({ translated: true, cached: true, text: cached });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = createHash("sha256").update(`translate:${ip}`).digest("hex");
    if (!(await consumeRateLimit(bucket, 20, 3600)))
      return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  const result = await translateGuideWithStatus(text, language);
  const changed = JSON.stringify(result.text) !== JSON.stringify(text);
  if (!changed) {
    console.error("[guide-translation] provider returned no usable translation", { language, failedParts: result.failedParts });
    return NextResponse.json({ error: "Translation temporarily unavailable", code: "TRANSLATION_UNAVAILABLE" }, { status: 503 });
  }
  // Never cache partially translated instructions (or change data from preview).
  if (result.complete && dbConfigured() && process.env.VERCEL_ENV !== "preview")
    await saveGuideTranslation(key, language, hash, result.text).catch(() => {});
  return NextResponse.json({ translated: true, partial: !result.complete, text: result.text });
}
