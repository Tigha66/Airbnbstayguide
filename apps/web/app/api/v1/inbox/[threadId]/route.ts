import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { hostReply } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";
const schema = z.object({ content: z.string().trim().min(1).max(2000) });
export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { threadId } = await params;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success || !z.uuid().safeParse(threadId).success) return NextResponse.json({ error: "Invalid reply" }, { status: 400 });
  return (await hostReply(host.user.id, threadId, parsed.data.content))
    ? NextResponse.json({ sent: true }, { status: 201 })
    : NextResponse.json({ error: "Conversation not found" }, { status: 404 });
}
