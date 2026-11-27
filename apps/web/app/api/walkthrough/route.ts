import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { consumeRateLimit } from "@/lib/repo";
import { safeOrigin } from "@/lib/api";
import { validateWalkthroughEnquiry } from "@/lib/walkthrough-enquiry";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (process.env.WALKTHROUGH_ENQUIRIES_ENABLED !== "true") {
    return NextResponse.json({ error: "Enquiries are not enabled in this environment." }, { status: 503 });
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
  if (!(await consumeRateLimit(`walkthrough:${bucket}`, 3, 3600))) {
    return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }
  await query(
    `INSERT INTO property_walkthrough_enquiries (name, email, property_name, property_url)
     VALUES ($1, $2, $3, $4)`,
    [enquiry.name, enquiry.email, enquiry.propertyName, enquiry.propertyUrl],
  );
  return NextResponse.json({ received: true }, { status: 201 });
}
