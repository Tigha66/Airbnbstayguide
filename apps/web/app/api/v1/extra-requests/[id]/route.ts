import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { getOwnedExtraRequest, setExtraRequestStatus } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";
import { stripeClient } from "@/lib/stripe";
import { applyOnlineExtraAction, ExtraPaymentConflict } from "@/lib/extra-payments";
const schema = z.object({ status: z.enum(["approved", "declined", "paid", "refunded"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  let body: unknown;
  try { body = parseJson(await request.text()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const req = await getOwnedExtraRequest(host.user.id, id);
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  let status = parsed.data.status;
  if (req.payment_intent_id) {
    // Paid online: move the money with Stripe rather than just changing a label.
    try {
      status = await applyOnlineExtraAction(stripeClient(), req, status);
    } catch (error) {
      if (error instanceof ExtraPaymentConflict) return NextResponse.json({ error: error.message }, { status: 409 });
      console.error("[extras] payment update failed", error instanceof Error ? error.name : "UnknownError");
      return NextResponse.json({ error: "The payment result could not be confirmed. Retry the same action to recover its result." }, { status: 502 });
    }
  } else if (status === "refunded") return NextResponse.json({ error: "Only online payments can be refunded here." }, { status: 409 });
  else if (req.status !== status && !(req.status === "pending" && ["approved", "declined"].includes(status)) && !(req.status === "approved" && status === "paid"))
    return NextResponse.json({ error: "That request has already changed. Refresh before continuing." }, { status: 409 });
  if (!await setExtraRequestStatus(host.user.id, id, status, req.status)) {
    const current = await getOwnedExtraRequest(host.user.id, id);
    if (current?.status !== status) return NextResponse.json({ error: "That request changed during processing. Refresh to see its current status." }, { status: 409 });
  }
  return NextResponse.json({ status });
}
