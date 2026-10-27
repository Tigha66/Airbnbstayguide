import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { listPortfolioReplyTemplates, createPortfolioReplyTemplate } from "@/lib/repo";

export const dynamic = "force-dynamic";
const templateSchema = z.object({
  title: z.string().trim().min(2).max(60),
  body: z.string().trim().min(1).max(1500),
});

async function manager() {
  const host = await requireHost();
  if ("response" in host) return host;
  if (host.user.plan !== "manager")
    return { response: NextResponse.json({ error: "Manager plan required" }, { status: 403 }) };
  return host;
}

export async function GET() {
  const host = await manager();
  if ("response" in host) return host.response;
  return NextResponse.json({ templates: await listPortfolioReplyTemplates(host.user.id) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await manager();
  if ("response" in host) return host.response;
  let parsed;
  try { parsed = templateSchema.safeParse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Invalid template" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  try {
    const template = await createPortfolioReplyTemplate(host.user.id, parsed.data);
    return template
      ? NextResponse.json({ template }, { status: 201 })
      : NextResponse.json({ error: "Maximum 30 saved replies" }, { status: 409 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json({ error: "A saved reply with this title already exists" }, { status: 409 });
    return NextResponse.json({ error: "Could not save reply" }, { status: 500 });
  }
}
