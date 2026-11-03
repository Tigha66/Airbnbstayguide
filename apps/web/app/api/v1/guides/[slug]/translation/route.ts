import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { demoProperties, languages } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";
import { unavailable } from "@/lib/api";
import { consumeRateLimit, getGuideTranslation, getPublishedProperty, saveGuideTranslation } from "@/lib/repo";
import { guideHash, guideLanguage, guideText, isTranslationComplete, translateGuideWelcome, translateGuideWithStatus } from "@/lib/translate";

export const dynamic = "force-dynamic";
// Translating a whole guide can take a little while the first time; afterwards it's cached.
export const maxDuration = 60;

/** GET ?lang=fr → the guide's text translated for guests (cached per guide version and language). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const language = url.searchParams.get("lang") ?? "";
  const scope = url.searchParams.get("scope") ?? "all";
  if (!(languages as readonly string[]).includes(language)) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  if (scope !== "all" && scope !== "welcome") return NextResponse.json({ error: "Unsupported translation scope" }, { status: 400 });

  const sample = demoProperties.find((p) => p.slug === slug);
  const found = sample ? null : dbConfigured() ? await getPublishedProperty(slug).catch(() => null) : null;
  const property = sample ?? found?.property;
  if (!property) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

  const text = guideText(property);
  // Already in the requested language: nothing to translate.
  if (guideLanguage(text) === language) return NextResponse.json({ translated: false, alreadyInLanguage: true });
  if (!aiConfigured()) return unavailable("Translation");

  const key = sample ? `sample:${slug}` : property.id;
  const hash = guideHash(text);
  if (dbConfigured()) {
    const cached = await getGuideTranslation(key, language, hash).catch(() => null);
    // Use only complete, source-matched translations; partial or stale data is rejected.
    if (cached && isTranslationComplete(text, cached, language)) {
      if (scope === "welcome")
        return NextResponse.json({ translated: true, cached: true, scope: "welcome", description: cached.description },
          { headers: { "Cache-Control": "private, no-store" } });
      return NextResponse.json({ translated: true, cached: true, text: cached },
        { headers: { "Cache-Control": "private, no-store" } });
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = createHash("sha256").update(`translate:${ip}`).digest("hex");
    if (!(await consumeRateLimit(bucket, 20, 3600)))
      return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  // A short welcome can succeed even when a longer house-instruction translation times out.
  // It is returned separately and must never be presented as a fully translated guide.
  if (scope === "welcome") {
    try {
      const description = await translateGuideWelcome(text.description, language);
      if (description) return NextResponse.json({ translated: true, scope: "welcome", description }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch {
      console.error("[guide-translation] welcome-only provider request failed", { language });
    }
    return NextResponse.json({ error: "Welcome translation temporarily unavailable", code: "TRANSLATION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  const result = await translateGuideWithStatus(text, language);
  const changed = JSON.stringify(result.text) !== JSON.stringify(text);
  if (!result.complete || !changed) {
    console.error("[guide-translation] provider returned no usable translation", { language, failedParts: result.failedParts });
    return NextResponse.json({ error: "Translation temporarily unavailable", code: "TRANSLATION_UNAVAILABLE" }, { status: 503 });
  }
  // Serve only complete translations. Never cache or display mixed-language instructions.
  if (dbConfigured() && process.env.VERCEL_ENV !== "preview")
    await saveGuideTranslation(key, language, hash, result.text).catch(() => {});
  return NextResponse.json({ translated: true, text: result.text });
}
