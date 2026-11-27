import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";
import { requireHost } from "@/lib/session";

export const dynamic = "force-dynamic";
/** Founder-only, verified-session retrieval. No public list endpoint exists. */
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!host.user.emailVerified || !isAdminEmail(host.user.email)) return NextResponse.json({ error: "Not found." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const enquiries = await query(`SELECT id,name,email,property_name AS "propertyName",property_url AS "propertyUrl",customer_email_status AS "customerEmailStatus",internal_email_status AS "internalEmailStatus",created_at AS "createdAt" FROM property_walkthrough_enquiries ORDER BY created_at DESC LIMIT 100`);
  return NextResponse.json({ enquiries }, { headers: { "Cache-Control": "private, no-store" } });
}
