import { enabledHost, invitation, pilot, syntheticTransportEnabled } from "@/lib/openwa-inbox";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, safeOrigin } from "@/lib/api";
import { requireHost } from "@/lib/session";
import { consumeRateLimit, getOwnedProperty } from "@/lib/repo";
import { applicationOrigin } from "@/lib/origin";
import { guideWhatsAppMessage, normaliseWhatsAppNumber } from "@/lib/whatsapp";

const inputSchema = z.object({ phone: z.string().max(40), consent: z.literal(true) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (syntheticTransportEnabled())
    return NextResponse.json({ error: "Synthetic QA transport is active. No WhatsApp message was sent." }, { status: 409 });
  // This gateway sends from the operator's account. Other hosts need their own sender.
  const allowed = (process.env.OPENWA_HOST_EMAILS || "").split(",").map((email) => email.trim().toLowerCase());
  if (!allowed.includes(host.user.email.toLowerCase())) return NextResponse.json({ error: "WhatsApp sending is not enabled for this account." }, { status: 403 });
  const apiKey = process.env.OPENWA_API_KEY;
  const sessionId = process.env.OPENWA_SESSION_ID;
  const baseUrl = process.env.OPENWA_BASE_URL;
  if (!apiKey || !sessionId || !baseUrl) return NextResponse.json({ error: "WhatsApp sending has not been configured." }, { status: 503 });
  let input;
  try { input = inputSchema.parse(parseJson(await request.text())); }
  catch { return NextResponse.json({ error: "Enter an international phone number and confirm permission to message the guest." }, { status: 400 }); }
  const phone = normaliseWhatsAppNumber(input.phone);
  if (!phone) return NextResponse.json({ error: "Include the country code, for example +447700900123." }, { status: 400 });
  const { id } = await params;
  const property = await getOwnedProperty(host.user.id, id);
  if (!property) return NextResponse.json({ error: "Guide not found." }, { status: 404 });
  if (property.status !== "published") return NextResponse.json({ error: "Publish this guide before sending it." }, { status: 409 });
  if (pilot() && (!enabledHost(host.user) || phone !== pilot()?.guest)) return NextResponse.json({ error: "Pilot recipient or sender is not enabled." }, { status: 403 });
  let text = guideWhatsAppMessage(property.name, `${applicationOrigin()}/g/${property.slug}`);
  const endpoint = new URL(baseUrl);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash)
    return NextResponse.json({ error: "WhatsApp gateway configuration is invalid." }, { status: 503 });
  endpoint.pathname = `/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;
  if (!(await consumeRateLimit(`whatsapp:host:${host.user.id}`, 20, 3600)))
    return NextResponse.json({ error: "Hourly WhatsApp limit reached. Try again later." }, { status: 429 });
  const fingerprint = createHash("sha256").update(`${host.user.id}:${id}:${phone}:${text}`).digest("hex");
  // Reserve before sending. Ambiguous responses stay reserved to prevent duplicate sends.
  if (!(await consumeRateLimit(`whatsapp:send:${fingerprint}`, 1, 600)))
    return NextResponse.json({ error: "This message was already attempted recently. Check WhatsApp before sending again." }, { status: 409 });
  const consentInvite = await invitation(host.user.id, id, phone);
  if (consentInvite === null) return NextResponse.json({ error: "This pilot guest already has a different property conversation." }, { status: 409 });
  text += consentInvite;
  try {
    const response = await fetch(endpoint, {
      method: "POST", headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: `${phone}@c.us`, text }),
      signal: AbortSignal.timeout(20000), cache: "no-store", redirect: "error",
    });
    const result = await response.json();
    if (response.ok && (result?.success === true || typeof result?.messageId === "string"))
      return NextResponse.json({ status: "accepted", message: "WhatsApp accepted the message. Check WhatsApp for delivery." });
  } catch { /* A timeout or provider error may happen after WhatsApp has sent the message. */ }
  return NextResponse.json({ status: "unknown", message: "Delivery is unconfirmed. Check WhatsApp before sending again. The message may have arrived despite the gateway error." }, { status: 202 });
}
