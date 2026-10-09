import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { aiConfigured } from "@/lib/ai";
import { buildSections } from "@/lib/guide-builder";
import { consumeRateLimit, propertyLimitReached } from "@/lib/repo";
const schema = z.object({ manual: z.string().trim().min(20).max(12000) });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least a few sentences of your house manual." }, { status: 400 });
  // Only for hosts who can still add a property, and AI is rate-limited per host (shared with
  // property creation). Past the limit, the built-in parser still organises the manual.
  if (await propertyLimitReached(host.user))
    return NextResponse.json({ error: "You've reached your plan's property limit. Upgrade to add more." }, { status: 403 });
  const useAi = aiConfigured() && (await consumeRateLimit(`ai-build:${host.user.id}`, 20, 3600));
  return NextResponse.json(await buildSections(parsed.data.manual, useAi));
}
