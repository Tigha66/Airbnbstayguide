import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { hasManagerAccess, setPortfolioRuleEnabled, deletePortfolioRule, updatePortfolioRule } from "@/lib/repo";
import { safeOrigin, parseJson } from "@/lib/api";
const schema = z.union([
  z.object({ enabled: z.boolean() }).strict(),
  z.object({ keyword: z.string().trim().min(2).max(50), label: z.string().trim().min(2).max(50), priority: z.enum(["normal", "urgent"]) }).strict(),
]);
async function allowed(request: Request) {
  if (!safeOrigin(request)) return { response: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  const host = await requireHost();
  if ("response" in host) return host;
  if (!(await hasManagerAccess(host.user.id))) return { response: NextResponse.json({ error: "Manager plan required" }, { status: 403 }) };
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
  try {
    const updated = "enabled" in parsed.data
      ? await setPortfolioRuleEnabled(host.user.id, id, parsed.data.enabled)
      : await updatePortfolioRule(host.user.id, id, parsed.data);
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "This keyword already has a rule" }, { status: 409 });
    return NextResponse.json({ error: "Could not update rule" }, { status: 500 });
  }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const host = await allowed(request);
  if ("response" in host) return host.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid rule" }, { status: 400 });
  const deleted = await deletePortfolioRule(host.user.id, id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Rule not found" }, { status: 404 });
}
