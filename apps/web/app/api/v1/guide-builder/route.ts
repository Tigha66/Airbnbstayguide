import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { aiConfigured } from "@/lib/ai";
import { consumeAiUsage, consumeRateLimit } from "@/lib/repo";
import { buildSections } from "@/lib/guide-builder";
const schema = z.object({ manual: z.string().trim().min(20).max(12000) });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least a few sentences of your house manual." }, { status: 400 });
  const allowed = aiConfigured() && host.user.emailVerified && await consumeRateLimit("guide-builder:" + host.user.id, 10, 3600) && await consumeAiUsage(host.user.id);
  return NextResponse.json(await buildSections(parsed.data.manual, allowed));
}
