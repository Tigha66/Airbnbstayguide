import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { createOrganizationInvitation, getOrganizationMembers, getUserOrganizations } from "@/lib/repo";

/**
 * GET /api/v1/organizations          -> organizations the signed-in user belongs to
 * GET /api/v1/organizations?organizationId=... -> members of that organization
 *
 * KNOWN GAP: this does not yet verify the signed-in user is a member of the
 * requested organizationId before returning its member list (the Neon schema
 * has no org-membership table to check against yet). Do not rely on this in
 * production until that check lands — see repo.ts organization helpers.
 */
export async function GET(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  if (organizationId) return NextResponse.json(await getOrganizationMembers(organizationId));
  return NextResponse.json(await getUserOrganizations(host.user.id));
}

export async function POST(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const body = await request.json().catch(() => null);
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;
  const email = typeof body?.email === "string" ? body.email : null;
  const role = body?.role;
  const validRoles = ["owner", "manager", "cleaner", "viewer"];
  if (!organizationId || !email || !validRoles.includes(role))
    return NextResponse.json({ error: "organizationId, email, and a valid role are required" }, { status: 400 });
  const invitation = await createOrganizationInvitation(organizationId, email, role);
  return NextResponse.json(invitation, { status: 201 });
}
