/**
 * Preview-only build acceptance for the actual HCN guide translation path.
 *
 * Run deliberately by setting HCN_PREVIEW_BUILD_ACCEPTANCE=1 on a named Preview
 * branch. Never log keys, URLs with credentials, guest records, or guide text.
 * No production data is read or modified; no new guest property is created.
 */
import { demoProperties } from "@stayguide/shared";
import { translateGuide, guideText } from "../lib/translate";

if (process.env.HCN_PREVIEW_BUILD_ACCEPTANCE === "1") {
  if (process.env.VERCEL_ENV !== "preview")
    throw new Error("HCN acceptance may only run on Vercel Preview.");
  if (process.env.AI_PROVIDER !== "openai-compatible" ||
      new URL(process.env.AI_BASE_URL || "https://invalid.example").hostname !== "api.hcnsec.cn" ||
      !process.env.AI_API_KEY || !process.env.AI_TRANSLATION_MODEL)
    throw new Error("HCN acceptance requires Preview HCN model, provider URL and API key.");

  if (process.env.HCN_PREVIEW_RAW_PROBE === "1") {
  // Raw OpenAI-compatible probe differentiates bad keys/model routing from
  // JSON parser errors. Only protocol metadata is logged; never model content.
  const raw = await fetch(new URL("/v1/chat/completions", process.env.AI_BASE_URL!).toString(), {
    method: "POST",
    headers: { "Authorization": "Bearer " + process.env.AI_API_KEY, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: process.env.AI_TRANSLATION_MODEL,
      max_tokens: 180,
      messages: [{ role: "user", content: "Return only a JSON object with result set to Bonjour." }]
    }),
  });
  const rawBody = await raw.json() as {
    error?: { code?: string; type?: string };
    choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>;
  };
  if (!raw.ok) {
    console.error("HCN raw probe failed HTTP " + raw.status +
      " providerErrorType=" + String(rawBody.error?.type || "unknown").slice(0, 50) +
      " providerErrorCode=" + String(rawBody.error?.code || "unknown").slice(0, 50));
    throw new Error("Preview HCN model or key was rejected by provider");
  }
  const first = rawBody.choices?.[0];
  console.log("HCN raw probe HTTP 200 contentChars=" + String(first?.message?.content?.length || 0) +
    " reasoningChars=" + String(first?.message?.reasoning_content?.length || 0) +
    " finishReason=" + String(first?.finish_reason || "unknown").slice(0, 40) +
    " validJson=" + (() => { try { JSON.parse(first?.message?.content || ""); return true; } catch { return false; } })());
  }
  const original = guideText(demoProperties[0]);
  const languages = (process.env.HCN_PREVIEW_BUILD_LANGUAGES || "fr").split(",").map(x => x.trim()).filter(Boolean);
  const allowed = new Set(["fr", "de", "es", "ar"]);
  if (languages.length === 0 || languages.some(lang => !allowed.has(lang)))
    throw new Error("Invalid Preview QA languages");

  const token = "10:00 PM"; // Present in public demo guide and must remain unchanged.
  const started = Date.now();
  for (const lang of languages) {
    const begin = Date.now();
    const output = await translateGuide(original, lang);
    const changed = output.description !== original.description;
    const count = output.sections.filter((s, i) => s.body !== original.sections[i].body || s.title !== original.sections[i].title).length;
    const codesPreserved = original.sections.every((s,i) => !s.body.includes(token) || output.sections[i].body.includes(token));
    const scriptMatches = lang !== "ar" || /[\u0600-\u06FF]/.test(output.description + output.sections.map(s => s.body).join(" "));
    console.log("HCN QA language=" + lang + " durationMs=" + (Date.now() - begin) +
      " descriptionTranslated=" + changed + " sectionsTranslated=" + count + "/" + original.sections.length +
      " codesPreserved=" + codesPreserved + " scriptMatches=" + scriptMatches);
    if (!changed || count !== original.sections.length || !codesPreserved || !scriptMatches)
      throw new Error("HCN QA incomplete full-guide translation for " + lang);
  }
  console.log("HCN QA completed " + languages.length + " uncached language(s) in " + (Date.now() - started) + " ms");
} else {
  console.log("HCN build acceptance disabled outside explicitly selected Preview QA branch");
}
