import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { listPortfolioRules, listPortfolioTriage, listPortfolioReplyTemplates } from "@/lib/repo";
export const dynamic = "force-dynamic";
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (host.user.plan !== "manager") return NextResponse.json({ error: "Manager plan required" }, { status: 403 });
  const [rules, triage, templates] = await Promise.all([listPortfolioRules(host.user.id), listPortfolioTriage(host.user.id), listPortfolioReplyTemplates(host.user.id)]);
  return NextResponse.json({ rules, triage, templates }, { headers: { "Cache-Control": "private, no-store" } });
}
