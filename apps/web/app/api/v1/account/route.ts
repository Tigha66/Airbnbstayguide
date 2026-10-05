import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteUser } from "@/lib/repo";
import { safeOrigin } from "@/lib/api";
/** Deletes the host and (via ON DELETE CASCADE) all their properties, chats and requests. */
export async function DELETE(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  await deleteUser(host.user.id);
  return NextResponse.json({ deleted: true });
}
