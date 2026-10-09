import { aiConfigured, aiProviderInfo } from "./ai";
import { reportError } from "./monitoring";
import { consumeRateLimit, inCooldown, refundAiUsage, reserveAiUsage, startCooldown } from "./repo";

/** How long AI is skipped after the provider reports no credit, rate limiting or an outage. */
export const AI_COOLDOWN_SECONDS = 5 * 60;
const COOLDOWN = "ai-provider";

/** HTTP status of an AI SDK error (APICallError, or the last error inside a RetryError). */
export function providerStatus(error: unknown): number | undefined {
  const e = error as { statusCode?: number; status?: number; lastError?: unknown; cause?: unknown; errors?: unknown[] } | null;
  if (!e || typeof e !== "object") return undefined;
  if (typeof e.statusCode === "number") return e.statusCode;
  if (typeof e.status === "number") return e.status;
  return providerStatus(e.lastError) ?? providerStatus(e.cause) ?? (Array.isArray(e.errors) ? providerStatus(e.errors.at(-1)) : undefined);
}

/** 402 (out of credit), 429 (rate limited) or 5xx (provider down): stop calling it for a while. */
export function isProviderOutage(error: unknown) {
  const status = providerStatus(error);
  return status === 402 || status === 429 || (status !== undefined && status >= 500);
}

/** AI is configured and not paused after a recent provider outage. */
export async function aiAvailable() {
  if (!aiConfigured()) return false;
  return !(await inCooldown(COOLDOWN).catch(() => false));
}

export type AiRun<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "off" | "cooldown" | "allowance" | "error" };

/**
 * Runs an AI call billed to a host's monthly allowance. The units are reserved first (so the
 * counter can never pass the limit) and given back if the call fails, so hosts are only charged
 * for answers they got. A provider outage pauses AI for everyone for AI_COOLDOWN_SECONDS.
 */
export async function runWithAllowance<T>(ownerId: string, units: number, call: () => Promise<T>): Promise<AiRun<T>> {
  if (!aiConfigured()) return { ok: false, reason: "off" };
  if (await inCooldown(COOLDOWN).catch(() => false)) return { ok: false, reason: "cooldown" };
  if (!(await reserveAiUsage(ownerId, units))) return { ok: false, reason: "allowance" };
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    await refundAiUsage(ownerId, units).catch(() => {});
    await noteAiFailure(error);
    return { ok: false, reason: "error" };
  }
}

/** Logs an AI failure and, for provider outages, starts the cooldown. */
export async function noteAiFailure(error: unknown) {
  const status = providerStatus(error);
  const { provider, model } = aiProviderInfo();
  console.error("[ai] call failed", provider, model, status ?? "", error);
  await reportError(error, { area: "ai", provider, model, status: String(status ?? "none") });
  if (isProviderOutage(error)) await startCooldown(COOLDOWN, AI_COOLDOWN_SECONDS).catch(() => {});
}

/** AI guide building per host per hour (shared by the guide builder and property creation). */
export const AI_BUILDS_PER_HOUR = 10;

/**
 * Organises a pasted house manual into sections with AI, billed as one unit of the host's
 * allowance and limited to AI_BUILDS_PER_HOUR. Returns undefined when AI isn't used (off, paused,
 * over a limit or failed); callers then fall back to the built-in parser.
 */
export async function buildSectionsWithBudget<T>(ownerId: string, build: () => Promise<T>): Promise<T | undefined> {
  if (!(await aiAvailable())) return undefined;
  if (!(await consumeRateLimit(`ai-build:${ownerId}`, AI_BUILDS_PER_HOUR, 3600))) return undefined;
  const run = await runWithAllowance(ownerId, 1, build);
  return run.ok ? run.value : undefined;
}
