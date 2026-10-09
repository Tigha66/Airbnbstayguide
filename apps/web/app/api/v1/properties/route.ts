import { NextResponse } from "next/server";
import { propertySchema } from "@stayguide/shared";
import { requireHost } from "@/lib/session";
import { consumeRateLimit, createProperty, listProperties, LimitError, propertyLimitReached } from "@/lib/repo";
import { syncSubscriptionQuantity } from "@/lib/billing";
import { safeOrigin, parseJson } from "@/lib/api";
import { aiConfigured } from "@/lib/ai";
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
  let sections: Awaited<ReturnType<typeof buildSectionsWithAi>> | undefined;
  // AI organising is limited per host (shared with the guide builder); past the limit the
  // built-in parser still creates the guide.
  if (input.description.trim().length > 40 && aiConfigured() && (await consumeRateLimit(`ai-build:${host.user.id}`, 20, 3600))) {
    try {
      sections = await buildSectionsWithAi(input.description);
    } catch {
      sections = undefined; // Falls back to the built-in manual parser.
    }
  }
  try {
    const property = await createProperty(host.user, input, sections);
    await syncSubscriptionQuantity(host.user.id);
    return NextResponse.json({ property, ai: Boolean(sections?.length) }, { status: 201 });
  } catch (e) {
    if (e instanceof LimitError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Could not create the property." }, { status: 500 });
  }
}
