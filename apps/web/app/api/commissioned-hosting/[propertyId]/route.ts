import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getCommissionedGuideHosting } from "@/lib/commissioned-hosting";

export const dynamic = "force-dynamic";

/** Customer-visible, owner-scoped status only. This endpoint cannot issue or alter hosting. */
export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { propertyId } = await params;
  const status = await getCommissionedGuideHosting(host.user.id, propertyId);
  if (!status) return NextResponse.json({ error: "Hosting record not found." }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "private, no-store" } });
}
