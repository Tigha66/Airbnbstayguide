import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteProperty, propertyDataSchema, updateProperty } from "@/lib/repo";
import { syncSubscriptionQuantity } from "@/lib/billing";
import { safeOrigin } from "@/lib/api";
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Ctx) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  const raw = await request.text();
  if (raw.length > 400_000) return NextResponse.json({ error: "Guide is too large" }, { status: 413 });
  const parsed = propertyDataSchema.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid guide data" }, { status: 400 });
  const property = await updateProperty(host.user.id, id, parsed.data);
  return property ? NextResponse.json({ property }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function DELETE(request: Request, { params }: Ctx) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!(await deleteProperty(host.user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await syncSubscriptionQuantity(host.user.id);
  return NextResponse.json({ deleted: true });
}
