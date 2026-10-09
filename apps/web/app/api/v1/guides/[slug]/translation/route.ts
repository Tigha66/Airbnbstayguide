import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { demoProperties, languages } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { aiAvailable, isProviderOutage, noteAiFailure } from "@/lib/ai-budget";
import { unavailable } from "@/lib/api";
import { consumeRateLimit, getGuideTranslation, getPublishedProperty, refundAiUsage, reserveAiUsage, saveGuideTranslation } from "@/lib/repo";
import { guideHash, guideLanguage, guideText, translateGuideWithStatus } from "@/lib/translate";

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
  // Needs the database for caching and budgets, and an AI provider that isn't paused.
  if (!dbConfigured() || !(await aiAvailable())) return unavailable("Translation");

  const key = sample ? `sample:${slug}` : property.id;
  const hash = guideHash(text);
  const cached = await getGuideTranslation(key, language, hash).catch(() => null);
  if (cached) return NextResponse.json({ translated: true, cached: true, text: cached });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = createHash("sha256").update(`translate:${ip}`).digest("hex");
  if (!(await consumeRateLimit(bucket, 20, 3600))) return NextResponse.json({ error: "Please try again later." }, { status: 429 });

  // A translation costs one AI call per section plus one for the welcome text and extras. Real
  // guides are billed to the host's monthly AI allowance; sample guides share a global daily cap.
  const units = text.sections.length + 1;
  if (sample) {
    if (!(await consumeRateLimit("ai-demo-translate-global", 60, 86400))) return unavailable("Translation");
  } else if (!(await reserveAiUsage(found!.ownerId, units))) {
    return NextResponse.json({ translated: false, reason: "allowance" });
  }
  let outage: unknown = null;
  const { text: translated, complete } = await translateGuideWithStatus(text, language, (error) => {
    if (!outage && isProviderOutage(error)) outage = error;
  });
  if (outage) await noteAiFailure(outage);
  const changed = JSON.stringify(translated) !== JSON.stringify(text);
  // Nothing translated at all (provider down): don't charge the host.
  if (!changed && !sample) await refundAiUsage(found!.ownerId, units).catch(() => {});
  // Only complete translations are cached; a partial one is shown now and retried next time.
  if (changed && complete) await saveGuideTranslation(key, language, hash, translated, true).catch(() => {});
  return NextResponse.json({ translated: changed, complete, text: changed ? translated : undefined });
}
