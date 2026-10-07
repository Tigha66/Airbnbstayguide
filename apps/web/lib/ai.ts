import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const HF_ROUTER = "https://router.huggingface.co/v1";
export const DEFAULT_HF_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

/**
 * AI_PROVIDER: "huggingface" (default when HF_TOKEN is set), "openai-compatible"
 * (any OpenAI-style endpoint via AI_BASE_URL + AI_API_KEY, e.g. Groq), "openai" or "anthropic".
 */
function provider() {
  return process.env.AI_PROVIDER || (process.env.HF_TOKEN ? "huggingface" : "");
}
export function aiConfigured() {
  switch (provider()) {
    case "huggingface":
      return Boolean(process.env.HF_TOKEN);
    case "openai-compatible":
      return Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY && process.env.AI_MODEL);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY && process.env.AI_MODEL);
    default:
      return false;
  }
}
export function aiModel() {
  const p = provider();
  if (p === "huggingface")
    return createOpenAI({ baseURL: HF_ROUTER, apiKey: process.env.HF_TOKEN }).chat(process.env.AI_MODEL || DEFAULT_HF_MODEL);
  if (p === "openai-compatible")
    return createOpenAI({ baseURL: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY }).chat(process.env.AI_MODEL!);
  if (p === "openai") return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(process.env.AI_MODEL!);
  if (p === "anthropic") return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(process.env.AI_MODEL!);
  throw new Error("AI is not configured");
}
/** Extracts the first JSON object/array from model text (open models often wrap JSON in prose or fences). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.search(/[[{]/);
  if (start < 0) throw new Error("No JSON in model output");
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
  }
  throw new Error("Unterminated JSON in model output");
}
export async function generateJson(system: string, prompt: string, maxOutputTokens = 1200, timeoutMs = 25000) {
  const result = await generateText({
    model: aiModel(),
    system,
    prompt,
    temperature: 0.2,
    maxOutputTokens,
    abortSignal: AbortSignal.timeout(timeoutMs),
  });
  return extractJson(result.text);
}

/** Owner diagnostics: makes one tiny AI call and reports whether it works (and why not). */
export async function aiHealthCheck(): Promise<{ ok: boolean; provider: string; model: string; detail: string }> {
  const p = provider() || "none";
  const model = p === "huggingface" ? process.env.AI_MODEL || DEFAULT_HF_MODEL : process.env.AI_MODEL || "";
  if (!aiConfigured()) return { ok: false, provider: p, model, detail: "No AI provider is configured." };
  try {
    const result = await generateText({
      model: aiModel(),
      prompt: "Reply with the single word OK.",
      maxOutputTokens: 5,
      abortSignal: AbortSignal.timeout(15000),
    });
    return { ok: true, provider: p, model, detail: `Answered: ${result.text.trim().slice(0, 40) || "(empty)"}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, provider: p, model, detail: message.slice(0, 300) };
  }
}
