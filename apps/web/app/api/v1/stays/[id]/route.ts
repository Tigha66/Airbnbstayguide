import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteStay } from "@/lib/repo";
import { safeOrigin } from "@/lib/api";
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return (await deleteStay(host.user.id, id))
    ? NextResponse.json({ deleted: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
