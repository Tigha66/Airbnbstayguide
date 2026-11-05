import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { billingPreflight } from "@/lib/billing-preflight";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Owner only: read-only checkout configuration audit, never a live charge or email send. */
export async function GET() {
  const host = await requireHost();
  if ("response" in host || !isAdminEmail(host.user.email))
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });

  const result = await billingPreflight();
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
