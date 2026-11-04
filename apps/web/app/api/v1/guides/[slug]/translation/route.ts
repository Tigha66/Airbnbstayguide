import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { demoProperties, languages } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { unavailable } from "@/lib/api";
import { consumeRateLimit, getGuideTranslation, getPublishedProperty, saveGuideTranslation } from "@/lib/repo";
import { completeGuideTranslation, guideHash, guideLanguage, guideText, translateGuide } from "@/lib/translate";

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
  if (guideLanguage(text) === language) return NextResponse.json({ translated: false, originalLanguage: true });
  if (!aiConfigured()) return unavailable("Translation");

  const key = sample ? `sample:${slug}` : property.id;
  const hash = guideHash(text);
  const dedicatedModel = Boolean(process.env.AI_TRANSLATION_MODEL?.trim());
  if (dbConfigured()) {
    const cached = await getGuideTranslation(key, language, hash).catch(() => null);
    // Legacy caches could contain a mix of original English and translated
    // sections; never serve those as a successful dedicated-model translation.
    if (cached && completeGuideTranslation(text, cached, language))
      return NextResponse.json({ translated: true, cached: true, text: cached });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = createHash("sha256").update(`translate:${ip}`).digest("hex");
    if (!(await consumeRateLimit(bucket, 20, 3600)))
      return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  const partialKey = `${language}:partial`;
  // Partial work stays private to this source version and is never served as
  // a completed translation. Retrying resumes successfully translated pieces.
  const previous = dedicatedModel && dbConfigured()
    ? await getGuideTranslation(key, partialKey, hash).catch(() => null)
    : null;
  const translated = await translateGuide(text, language, previous ?? undefined);
  const changed = JSON.stringify(translated) !== JSON.stringify(text);
  // Never cache a partially translated guide as if the selected language were
  // complete. The HCN provider may time out on just one of several sections.
  if (!completeGuideTranslation(text, translated, language)) {
      if (dedicatedModel && dbConfigured()) await saveGuideTranslation(key, partialKey, hash, translated).catch(() => {});
      return NextResponse.json({
        error: "Translation is still being prepared. The original guide is available while you retry.",
        code: "TRANSLATION_INCOMPLETE",
        retryable: true,
        translatedSections: text.sections.filter((section, i) => translated.sections[i]?.body !== section.body).length,
        totalSections: text.sections.length,
      }, { status: 503, headers: { "Retry-After": "3" } });
  }
  if (changed && dbConfigured()) await saveGuideTranslation(key, language, hash, translated).catch(() => {});
  return NextResponse.json({ translated: changed, text: changed ? translated : undefined });
}
