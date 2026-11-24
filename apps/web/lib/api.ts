import { NextResponse } from "next/server";
import { applicationOrigin } from "./origin";
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
  try {
    const qaOrigin = "https://stayguide-isolated-qa-git-test-founding-fi-6322a7-hajabdelhak66.vercel.app";
    const approved = origin === applicationOrigin() || (process.env.VERCEL_ENV === "preview" && origin === qaOrigin);
    return approved && request.headers.get("sec-fetch-site") !== "cross-site";
  }
  catch { return false; }
}
export function parseJson(raw: string) {
  if (new TextEncoder().encode(raw).length > 24000)
    throw new Error("Request too large");
  return JSON.parse(raw);
}
