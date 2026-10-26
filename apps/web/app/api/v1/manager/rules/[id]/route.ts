import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { setPortfolioRuleEnabled, deletePortfolioRule } from "@/lib/repo";
import { safeOrigin, parseJson } from "@/lib/api";
const schema = z.object({ enabled: z.boolean() });
async function allowed(request: Request) {
  if (!safeOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  const host = await requireHost();
  if ("response" in host) return host;
  if (host.user.plan !== "manager") return { response: NextResponse.json({ error: "Manager plan required" }, { status: 403 }) };
  return host;
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const host = await allowed(request);
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid rule" }, { status: 400 });
  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Invalid rule" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid rule" }, { status: 400 });
  const updated = await setPortfolioRuleEnabled(host.user.id, id, parsed.data.enabled);
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const host = await allowed(request);
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid rule" }, { status: 400 });
  const deleted = await deletePortfolioRule(host.user.id, id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
}
