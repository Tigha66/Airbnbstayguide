import { NextResponse } from "next/server";
export function unavailable(service: string) {
  return NextResponse.json(
    {
      error: `${service} is not configured. This feature is unavailable in the demo.`,
      code: "SERVICE_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}
export function safeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin)
    return Boolean(request.headers.get("authorization")?.startsWith("Bearer "));
  return (
    origin === (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin)
  );
}
/** Body size limit for JSON requests (24 KB). */
export const JSON_LIMIT = 24_000;
/** A whole guide (all sections and extras) is larger: the one exception, used by the guide editor. */
export const GUIDE_JSON_LIMIT = 200_000;
export class RequestTooLarge extends Error {}
/** Like parseJson, but returns null for malformed or oversized bodies (validation then answers 400). */
export function parseJsonOrNull(raw: string, limit = JSON_LIMIT): unknown {
  try {
    return parseJson(raw, limit);
  } catch {
    return null;
  }
}
/** Parses a JSON request body within a size limit. Throws RequestTooLarge, or SyntaxError for bad JSON. */
export function parseJson(raw: string, limit = JSON_LIMIT) {
  if (new TextEncoder().encode(raw).length > limit) throw new RequestTooLarge("Request too large");
  return JSON.parse(raw);
}
