import { NextResponse } from "next/server";
import { serviceStatus } from "@/lib/status";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = await serviceStatus();
  // "ok" covers what a paid deployment needs; Sentry is optional.
  const required = services.filter((s) => s.key !== "monitoring");
  return NextResponse.json(
    { ok: required.every((s) => s.ok), checkedAt: new Date().toISOString(), services },
    { headers: { "Cache-Control": "no-store" } },
  );
}
