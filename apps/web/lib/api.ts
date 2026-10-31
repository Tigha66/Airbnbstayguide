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
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    if (origin === applicationOrigin()) return true;

    // Vercel's stable Git-branch URL differs from its immutable deployment URL.
    // Trust only the branch hostname supplied by Vercel, and only in Preview.
    const branchHost = process.env.VERCEL_ENV === "preview"
      ? process.env.VERCEL_BRANCH_URL
      : undefined;
    return Boolean(branchHost &&
      /^[a-z0-9-]+\.vercel\.app$/.test(branchHost) &&
      origin === `https://${branchHost}`);
  } catch {
    return false;
  }
}
export function parseJson(raw: string) {
  if (new TextEncoder().encode(raw).length > 24000)
    throw new Error("Request too large");
  return JSON.parse(raw);
}
