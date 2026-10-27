import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { updatePortfolioReplyTemplate, deletePortfolioReplyTemplate } from "@/lib/repo";

const schema = z.object({ title: z.string().trim().min(2).max(60), body: z.string().trim().min(1).max(1500) });

async function allowed(request: Request) {
  if (!safeOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  const host = await requireHost();
  if ("response" in host) return host;
  if (host.user.plan !== "manager")
    return { response: NextResponse.json({ error: "Manager plan required" }, { status: 403 }) };
  return host;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const host = await allowed(request);
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Invalid template" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  try {
    const updated = await updatePortfolioReplyTemplate(host.user.id, id, parsed.data);
    return updated ? NextResponse.json({ template: updated }) : NextResponse.json({ error: "Reply not found" }, { status: 404 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json({ error: "A saved reply with this title already exists" }, { status: 409 });
    return NextResponse.json({ error: "Could not update reply" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const host = await allowed(request);
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  return await deletePortfolioReplyTemplate(host.user.id, id)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Reply not found" }, { status: 404 });
}
