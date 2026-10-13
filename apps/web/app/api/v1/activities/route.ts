import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getOrganizationActivities, logActivity } from "@/lib/repo";

/**
 * KNOWN GAP: does not verify the signed-in user belongs to organizationId
 * (no org-membership table exists on the Neon schema yet). Sign-in only.
 */
export async function GET(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  return NextResponse.json(await getOrganizationActivities(organizationId, limit, offset));
}

export async function POST(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const body = await request.json().catch(() => null);
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;
  const action = typeof body?.action === "string" ? body.action : null;
  if (!organizationId || !action) return NextResponse.json({ error: "organizationId and action required" }, { status: 400 });
  // The actor is always the signed-in caller, never a client-supplied userId.
  const id = await logActivity(organizationId, host.user.id, action, body?.details ?? {});
  return NextResponse.json({ id }, { status: 201 });
}
