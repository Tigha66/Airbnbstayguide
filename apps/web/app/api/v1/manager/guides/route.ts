import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { hasManagerAccess } from "@/lib/repo";
import { bulkReplaceHouseRules, bulkRulesSchema, listGuideReadiness } from "@/lib/portfolio-guides";
import { parseJson, safeOrigin } from "@/lib/api";

export const dynamic = "force-dynamic";

async function manager() {
  const host = await requireHost();
  if ("response" in host) return host;
  if (!(await hasManagerAccess(host.user.id)))
    return { response: NextResponse.json({ error: "Manager plan required" }, { status: 403 }) };
  return host;
}

export async function GET() {
  const host = await manager();
  if ("response" in host) return host.response;
  return NextResponse.json({ guides: await listGuideReadiness(host.user.id) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  if (!safeOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await manager();
  if ("response" in host) return host.response;
  const raw = await request.text();
  if (raw.length > 80_000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let input;
  try { input = bulkRulesSchema.safeParse(parseJson(raw)); }
  catch { return NextResponse.json({ error: "Invalid bulk change" }, { status: 400 }); }
  if (!input.success)
    return NextResponse.json({ error: "Invalid bulk change" }, { status: 400 });
  try {
    const updated = await bulkReplaceHouseRules(host.user.id, input.data);
    if (!updated)
      return NextResponse.json({
        error: "Nothing changed. One or more guides were edited, unowned, or lack a single rules section. Refresh and review your selection.",
      }, { status: 409 });
    return NextResponse.json({ updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not apply shared rules" }, { status: 500 });
  }
}
