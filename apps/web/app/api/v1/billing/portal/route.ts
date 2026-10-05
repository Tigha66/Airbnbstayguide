import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { getBilling } from "@/lib/repo";
import { appUrl, portalConfigurationId, stripeClient, stripeConfigured } from "@/lib/stripe";
import { safeOrigin, unavailable } from "@/lib/api";
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!stripeConfigured()) return unavailable("Billing");
  const host = await requireHost();
  if ("response" in host) return host.response;
  const billing = await getBilling(host.user.id);
  if (!billing?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet. Choose a plan first." }, { status: 404 });
  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      configuration: await portalConfigurationId(),
      return_url: `${appUrl(request)}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[billing] portal failed", error);
    return NextResponse.json({ error: "Could not open billing. Please try again." }, { status: 502 });
  }
}
