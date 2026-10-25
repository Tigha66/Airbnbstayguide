import { NextResponse } from "next/server";
import { propertySchema } from "@stayguide/shared";
import { requireHost } from "@/lib/session";
import { createProperty, listProperties, updateProperty, consumeAiUsage, consumeRateLimit, LimitError } from "@/lib/repo";
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
  try {
    let property = await createProperty(host.user, input);
    let sections: Awaited<ReturnType<typeof buildSectionsWithAi>> | undefined;
    if (input.description.trim().length > 40 && aiConfigured() && host.user.emailVerified) {
      try {
        if (await consumeRateLimit("guide-builder:" + host.user.id, 10, 3600) && await consumeAiUsage(host.user.id)) {
        sections = await buildSectionsWithAi(input.description);
        const saved = await updateProperty(host.user.id, property.id, { ...property, sections });
        if (saved) property = saved;
        }
      } catch { sections = undefined; } // Keep the saved manual draft.
    }
    await syncSubscriptionQuantity(host.user.id);
    return NextResponse.json({ property, ai: Boolean(sections?.length) }, { status: 201 });
  } catch (e) {
    if (e instanceof LimitError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: "Could not create the property." }, { status: 500 });
  }
}
