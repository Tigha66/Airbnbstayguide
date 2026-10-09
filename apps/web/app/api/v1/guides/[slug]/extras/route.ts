import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { dbConfigured } from "@/lib/db";
import { parseJsonOrNull, unavailable } from "@/lib/api";
import { attachExtraCheckout, consumeRateLimit, createExtraRequest, getPayoutAccount, getPublishedProperty, setExtraRequestStatusById } from "@/lib/repo";
import { appUrl, extraCheckoutParams, stripeClient, stripeConfigured } from "@/lib/stripe";
import { notifyExtraRequest } from "@/lib/notify";
const schema = z.object({
  extraId: z.string().min(1).max(80),
  guestName: z.string().trim().min(2).max(120),
  guestContact: z.string().trim().min(5).max(200),
  note: z.string().max(1000).default(""),
});
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Extras");
  const { slug } = await params;
  const parsed = schema.safeParse(parseJsonOrNull(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Please add your name and an email or phone number." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(createHash("sha256").update(`extra:${ip}:${slug}`).digest("hex"), 5, 3600)))
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  const extra = found?.property.extras.find((e) => e.id === parsed.data.extraId);
  if (!found || !extra) return NextResponse.json({ error: "This extra is no longer available." }, { status: 404 });
  const guest = { name: parsed.data.guestName, contact: parsed.data.guestContact, note: parsed.data.note };
  // Hosts with a ready Stripe Connect account get paid online; others confirm requests manually.
  const destination = stripeConfigured() && extra.price > 0 ? await getPayoutAccount(found.ownerId) : null;
  const notifyHost = (paidOnline: boolean) =>
    notifyExtraRequest({
      ownerId: found.ownerId,
      propertyName: found.property.name,
      extraName: extra.name,
      guestName: guest.name,
      guestContact: guest.contact,
      note: guest.note,
      paidOnline,
    }).catch(() => false);
  if (!destination) {
    const id = await createExtraRequest(found.property.id, extra, guest);
    await notifyHost(false);
    return NextResponse.json({ id, status: "pending" }, { status: 201 });
  }
  const id = await createExtraRequest(found.property.id, extra, guest, "awaiting_payment");
  try {
    const session = await stripeClient().checkout.sessions.create(
      extraCheckoutParams({
        requestId: id,
        propertyId: found.property.id,
        slug,
        extra,
        destination,
        guestEmail: guest.contact.includes("@") ? guest.contact : undefined,
        origin: appUrl(request),
      }),
    );
    await attachExtraCheckout(id, session.id);
    return NextResponse.json({ id, status: "awaiting_payment", checkoutUrl: session.url, approval: extra.approval }, { status: 201 });
  } catch (error) {
    console.error("[extras] checkout failed", error);
    await setExtraRequestStatusById(id, "pending");
    await notifyHost(false);
    return NextResponse.json({ id, status: "pending", note: "Online payment is unavailable right now; your host will confirm how to pay." }, { status: 201 });
  }
}
