import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { safeOrigin } from "@/lib/api";
import { sendVerificationEmail } from "@/lib/account-email";
import { applicationOrigin } from "@/lib/origin";
const reply = (message: string, status = 200) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  if (!safeOrigin(request)) return reply("Invalid origin", 403);
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (host.user.emailVerified) return reply("Your email address is already verified.");
  try {
    const sent = await sendVerificationEmail({ userId: host.user.id, email: host.user.email, origin: applicationOrigin() });
    return sent ? reply("Check your inbox for your verification link.") : reply("Email is temporarily unavailable. Please contact support.", 503);
  } catch { return reply("Could not send the verification email. Please wait before trying again.", 503); }
}
