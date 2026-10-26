import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { setPortfolioTriageStatus } from "@/lib/repo";
import { safeOrigin, parseJson } from "@/lib/api";
const schema = z.object({ status: z.enum(["open", "resolved"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (host.user.plan !== "manager") return NextResponse.json({ error: "Manager plan required" }, { status: 403 });
  const { threadId } = await params;
  if (!z.uuid().safeParse(threadId).success) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Invalid status" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const updated = await setPortfolioTriageStatus(host.user.id, threadId, parsed.data.status);
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}
