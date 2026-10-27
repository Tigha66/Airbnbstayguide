import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { dbConfigured } from "@/lib/db";
import { parseJson, unavailable } from "@/lib/api";
import { attachExtraCheckout, consumeRateLimit, createGuestExtraRequest, getPayoutAccount, getPublishedProperty } from "@/lib/repo";
import { appUrl, extraCheckoutParams, stripeClient, stripeConfigured } from "@/lib/stripe";
const schema = z.object({
  requestId: z.uuid().optional(),
  extraId: z.string().min(1).max(80),
  guestName: z.string().trim().min(2).max(120),
  guestContact: z.string().trim().min(5).max(200),
  note: z.string().max(1000).default(""),
});
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Extras");
  const { slug } = await params;
  let input;
  try { input = schema.parse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Please add your name and an email or phone number." }, { status: 400 }); }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(createHash("sha256").update(`extra:${ip}:${slug}`).digest("hex"), 5, 3600)))
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  const extra = found?.property.extras.find((e) => e.id === input.extraId);
  if (!found || !extra) return NextResponse.json({ error: "This extra is no longer available." }, { status: 404 });
  const guest = { name: input.guestName, contact: input.guestContact, note: input.note };
  // Hosts with a ready Stripe Connect account get paid online; others confirm requests manually.
  const destination = stripeConfigured() && extra.price > 0 ? await getPayoutAccount(found.ownerId) : null;
  const saved = await createGuestExtraRequest(input.requestId ?? crypto.randomUUID(), found.property.id, extra, guest, destination ? "awaiting_payment" : "pending");
  if (!saved) return NextResponse.json({ error: "This request has changed. Close the form and try again." }, { status: 409 });
  const { id } = saved;
  if (saved.status !== "awaiting_payment") return NextResponse.json({
    id, status: saved.status,
    ...(saved.checkout_session_id ? { checkoutUrl: `${appUrl(request)}/g/${slug}?extra=success&session_id=${encodeURIComponent(saved.checkout_session_id)}` } : {}),
  }, { status: 200 });
  if (!destination) return NextResponse.json({ error: "Online payment is temporarily unavailable. Please retry this request later." }, { status: 503 });
  try {
    const session = saved.checkout_session_id
      ? await stripeClient().checkout.sessions.retrieve(saved.checkout_session_id)
      : await stripeClient().checkout.sessions.create(
      extraCheckoutParams({
        requestId: id,
        propertyId: found.property.id,
        slug,
        extra: { ...extra, name: saved.extra_name, description: "" },
        destination,
        guestEmail: guest.contact.includes("@") ? guest.contact : undefined,
        origin: appUrl(request),
      }), { idempotencyKey: `stayguide:extra-checkout:${id}` },
    );
    if (session.status === "expired") return NextResponse.json({ error: "This checkout expired. Close this form and start a new request." }, { status: 409 });
    await attachExtraCheckout(id, session.id);
    const checkoutUrl = session.status === "complete"
      ? `${appUrl(request)}/g/${slug}?extra=success&session_id=${encodeURIComponent(session.id)}` : session.url;
    return NextResponse.json({ id, status: "awaiting_payment", checkoutUrl, approval: extra.approval }, { status: 201 });
  } catch (error) {
    console.error("[extras] checkout failed", error instanceof Error ? error.name : "UnknownError");
    // Stripe may have accepted the call before a timeout or database error.
    // Keep the same request and idempotency key; never invent a manual payment.
    return NextResponse.json({ error: "Could not open checkout. Please retry the same request." }, { status: 503 });
  }
}
