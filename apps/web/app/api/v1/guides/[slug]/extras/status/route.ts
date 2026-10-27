import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { unavailable } from "@/lib/api";
import { getPublishedProperty, guestExtraPaymentStatus } from "@/lib/repo";

/** Read only: payment state is written by verified webhooks or verified host actions. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Payment confirmation");
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(?:test|live)_[A-Za-z0-9]{20,200}$/.test(sessionId))
    return NextResponse.json({ error: "Invalid receipt" }, { status: 400 });
  const { slug } = await params;
  const found = await getPublishedProperty(slug);
  const status = found ? await guestExtraPaymentStatus(found.property.id, sessionId) : null;
  if (!status) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  return NextResponse.json({ status }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
