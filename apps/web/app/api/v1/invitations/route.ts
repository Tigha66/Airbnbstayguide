import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { acceptOrganizationInvitation } from "@/lib/repo";

/** Guest/host accepts a pending organization invite by its one-time token. */
export async function POST(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const result = await acceptOrganizationInvitation(token, host.user.id);
  if (!result) return NextResponse.json({ error: "Invitation is invalid, expired, or already used." }, { status: 404 });
  return NextResponse.json(result);
}
