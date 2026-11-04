import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { demoProperties, languages } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { unavailable } from "@/lib/api";
import { consumeRateLimit, getGuideTranslation, getPublishedProperty, saveGuideTranslation } from "@/lib/repo";
import { guideHash, guideLanguage, guideText, translateGuide } from "@/lib/translate";

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
  if (guideLanguage(text) === language) return NextResponse.json({ translated: false });
  if (!aiConfigured()) return unavailable("Translation");

  const key = sample ? `sample:${slug}` : property.id;
  const hash = guideHash(text);
  if (dbConfigured()) {
    const cached = await getGuideTranslation(key, language, hash).catch(() => null);
    if (cached) return NextResponse.json({ translated: true, cached: true, text: cached });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = createHash("sha256").update(`translate:${ip}`).digest("hex");
    if (!(await consumeRateLimit(bucket, 20, 3600)))
      return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  const translated = await translateGuide(text, language);
  const changed = JSON.stringify(translated) !== JSON.stringify(text);
  // Never cache a partially translated guide as if the selected language were
  // complete. The HCN provider may time out on just one of several sections.
  if (process.env.AI_TRANSLATION_MODEL?.trim()) {
    const sectionsComplete = text.sections.length === translated.sections.length && text.sections.every((section, i) => {
      const translatedSection = translated.sections[i];
      if (!translatedSection || translatedSection.id !== section.id) return false;
      // Empty or very short sections may legitimately contain no translatable prose.
      return section.body.trim().length < 20 ||
        (translatedSection.body.trim() && translatedSection.body !== section.body);
    });
    const descriptionComplete = !text.description.trim() || translated.description.trim() !== text.description.trim();
    const extrasComplete = text.extras.length === translated.extras.length && text.extras.every((extra, i) => {
      const item = translated.extras[i];
      return item?.id === extra.id && (item.name !== extra.name || item.description !== extra.description);
    });
    if (!changed || !sectionsComplete || !descriptionComplete || !extrasComplete || guideLanguage(translated) !== language)
      return NextResponse.json({
        error: "Translation is temporarily unavailable. The original guide is still available.",
        code: "TRANSLATION_UNAVAILABLE",
      }, { status: 503 });
  }
  if (changed && dbConfigured()) await saveGuideTranslation(key, language, hash, translated).catch(() => {});
  return NextResponse.json({ translated: changed, text: changed ? translated : undefined });
}
