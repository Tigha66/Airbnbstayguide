import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { buildSectionsWithAi } from "@/lib/guide-builder";
import { parseManual } from "@/lib/guide-parser";
import { buildSectionsWithBudget } from "@/lib/ai-budget";
import { propertyLimitReached } from "@/lib/repo";
const schema = z.object({ manual: z.string().trim().min(20).max(12000) });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least a few sentences of your house manual." }, { status: 400 });
  // Only for hosts who can still add a property. AI organising is limited to 10 per host per hour
  // and counts against the monthly AI allowance; otherwise the built-in parser organises the manual.
  if (await propertyLimitReached(host.user))
    return NextResponse.json({ error: "You've reached your plan's property limit. Upgrade to add more." }, { status: 403 });
  const manual = parsed.data.manual;
  const sections = await buildSectionsWithBudget(host.user.id, () => buildSectionsWithAi(manual));
  return NextResponse.json(sections?.length ? { sections, ai: true } : { sections: parseManual(manual), ai: false });
}
