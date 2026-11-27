import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { consumeRateLimit } from "@/lib/repo";
import { safeOrigin } from "@/lib/api";
import { validateWalkthroughEnquiry } from "@/lib/walkthrough-enquiry";
import { mailerConfigured, sendEmail, supportEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.WALKTHROUGH_ENQUIRIES_ENABLED !== "true") {
    return NextResponse.json({ error: "Sample requests are not enabled in this environment." }, { status: 503 });
  }
  if (!safeOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  let body: unknown;
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000) throw new Error();
    body = await request.json();
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const enquiry = validateWalkthroughEnquiry(body);
  if (!enquiry) return NextResponse.json({ error: "Check the name, email, property name and HTTPS property URL." }, { status: 400 });
  if (enquiry.company) return NextResponse.json({ received: true });
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const bucket = createHash("sha256").update(String(process.env.AUTH_SECRET || "stayguide-qa")).update(ip).digest("hex");
  if (!(await consumeRateLimit(`walkthrough:${bucket}`, 3, 3600))) return NextResponse.json({ error: "Please try again later." }, { status: 429 });

  const [recent] = await query<{ id: string }>(
    "SELECT id FROM property_walkthrough_enquiries WHERE lower(email)=lower($1) AND property_url=$2 AND created_at > now() - interval '15 minutes' ORDER BY created_at DESC LIMIT 1",
    [enquiry.email, enquiry.propertyUrl],
  );
  if (recent) return NextResponse.json({ received: true, duplicate: true });

  const [saved] = await query<{ id: string }>(
    "INSERT INTO property_walkthrough_enquiries (name,email,property_name,property_url) VALUES ($1,$2,$3,$4) RETURNING id",
    [enquiry.name,enquiry.email,enquiry.propertyName,enquiry.propertyUrl],
  );
  if (!saved?.id) return NextResponse.json({ error: "Request could not be saved." }, { status: 503 });

  if (!mailerConfigured()) {
    await query("UPDATE property_walkthrough_enquiries SET customer_email_status='failed', internal_email_status='failed' WHERE id=$1", [saved.id]);
    return NextResponse.json({ received: true, emailPending: true }, { status: 201 });
  }

  const customerMessage = `Thanks for requesting a free personalised GetStayGuide sample for ${enquiry.propertyName}. We have received your request and will review the publicly supplied property information manually. This is not an offer of property management or an authorised relationship with the property. We will reply to this email if we can prepare a suitable sample.

Support: ${supportEmail}`;
  const internalMessage = `A new GetStayGuide personalised sample request was saved.

Name: ${enquiry.name}
Email: ${enquiry.email}
Property: ${enquiry.propertyName}
Public website: ${enquiry.propertyUrl}
Request ID: ${saved.id}`;
  const results = await Promise.allSettled([
    sendEmail({
      to: enquiry.email,
      subject: "We received your GetStayGuide sample request",
      text: customerMessage,
      idempotencyKey: `walkthrough-customer:${saved.id}`,
    }),
    sendEmail({
      to: supportEmail,
      subject: `New GetStayGuide sample request: ${enquiry.propertyName}`,
      text: internalMessage,
      idempotencyKey: `walkthrough-internal:${saved.id}`,
    }),
  ]);
  const customerStatus = results[0].status === "fulfilled" ? "sent" : "failed";
  const internalStatus = results[1].status === "fulfilled" ? "sent" : "failed";
  await query(
    "UPDATE property_walkthrough_enquiries SET customer_email_status=$2, internal_email_status=$3 WHERE id=$1",
    [saved.id, customerStatus, internalStatus],
  );
  return NextResponse.json({ received: true, emailPending: customerStatus === "failed" || internalStatus === "failed" }, { status: 201 });
}
