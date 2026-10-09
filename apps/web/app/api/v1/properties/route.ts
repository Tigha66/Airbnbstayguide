import { NextResponse } from "next/server";
import { propertySchema } from "@stayguide/shared";
import { requireHost } from "@/lib/session";
import { createProperty, listProperties, LimitError, propertyLimitReached } from "@/lib/repo";
import { syncSubscriptionQuantity } from "@/lib/billing";
import { safeOrigin, parseJson } from "@/lib/api";
import { buildSectionsWithBudget } from "@/lib/ai-budget";
import { buildSectionsWithAi } from "@/lib/guide-builder";
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  return NextResponse.json({ properties: await listProperties(host.user.id) });
}
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  let input;
  try {
    input = propertySchema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ error: "Please check the property name and location." }, { status: 400 });
  }
  // Check the plan's limit before spending anything on AI.
  if (await propertyLimitReached(host.user))
    return NextResponse.json({ error: "You've reached your plan's property limit. Upgrade to add more." }, { status: 403 });
  // AI organising (10 per host per hour, counted against the monthly AI allowance); otherwise the
  // built-in parser creates the guide.
  const manual = input.description.trim();
  const sections = manual.length > 40 ? await buildSectionsWithBudget(host.user.id, () => buildSectionsWithAi(manual)) : undefined;
  try {
    const property = await createProperty(host.user, input, sections);
    await syncSubscriptionQuantity(host.user.id);
    return NextResponse.json({ property, ai: Boolean(sections?.length) }, { status: 201 });
  } catch (e) {
    if (e instanceof LimitError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Could not create the property." }, { status: 500 });
  }
}
