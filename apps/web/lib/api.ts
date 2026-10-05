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
export function parseJson(raw: string) {
  if (new TextEncoder().encode(raw).length > 24000)
    throw new Error("Request too large");
  return JSON.parse(raw);
}
