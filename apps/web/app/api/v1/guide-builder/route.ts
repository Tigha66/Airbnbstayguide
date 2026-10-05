import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { aiConfigured } from "@/lib/ai";
import { buildSections } from "@/lib/guide-builder";
const schema = z.object({ manual: z.string().trim().min(20).max(12000) });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least a few sentences of your house manual." }, { status: 400 });
  return NextResponse.json(await buildSections(parsed.data.manual, aiConfigured()));
}
