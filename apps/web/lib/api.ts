import { NextResponse } from "next/server";
import { allowedRequestOrigins } from "./origin";
export function unavailable(service: string) {
  return NextResponse.json(
    {
      error: `${service} is not configured. This feature is unavailable in the demo.`,
      code: "SERVICE_NOT_CONFIGURED",
    },
    { status: 503, headers: { "Cache-Control": "private, no-store" } },
  );
}
export function safeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return !request.headers.has("cookie");
  try { return allowedRequestOrigins().includes(origin) && request.headers.get("sec-fetch-site") !== "cross-site"; }
  catch { return false; }
}
export function parseJson(raw: string) {
  if (new TextEncoder().encode(raw).length > 24000)
    throw new Error("Request too large");
  return JSON.parse(raw);
}
