import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { createPortfolioRule } from "@/lib/repo";
import { safeOrigin, parseJson } from "@/lib/api";
const schema = z.object({
  keyword: z.string().trim().min(2).max(50),
  label: z.string().trim().min(2).max(50),
  priority: z.enum(["normal", "urgent"]),
});
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (host.user.plan !== "manager") return NextResponse.json({ error: "Manager plan required" }, { status: 403 });
  let parsed;
  try { parsed = schema.safeParse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Invalid rule" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid rule" }, { status: 400 });
  try {
    const rule = await createPortfolioRule(host.user.id, parsed.data);
    return rule ? NextResponse.json({ rule }, { status: 201 }) : NextResponse.json({ error: "Maximum 20 rules" }, { status: 409 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "This keyword already has a rule" }, { status: 409 });
    return NextResponse.json({ error: "Could not save rule" }, { status: 500 });
  }
}
