import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteProperty, propertyDataSchema, updateProperty } from "@/lib/repo";
import { syncSubscriptionQuantity } from "@/lib/billing";
import { GUIDE_JSON_LIMIT, parseJson, RequestTooLarge, safeOrigin } from "@/lib/api";
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Ctx) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  let body: unknown;
  try {
    body = parseJson((await request.text()) || "{}", GUIDE_JSON_LIMIT);
  } catch (error) {
    if (error instanceof RequestTooLarge) return NextResponse.json({ error: "Guide is too large" }, { status: 413 });
    return NextResponse.json({ error: "Invalid guide data" }, { status: 400 });
  }
  const parsed = propertyDataSchema.safeParse(body);
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
