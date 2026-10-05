import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { setExtraRequestStatus } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";
const schema = z.object({ status: z.enum(["approved", "declined", "paid"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  return (await setExtraRequestStatus(host.user.id, id, parsed.data.status))
    ? NextResponse.json({ status: parsed.data.status })
    : NextResponse.json({ error: "Request not found" }, { status: 404 });
}
