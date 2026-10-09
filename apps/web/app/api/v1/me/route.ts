import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, authConfigured } from "@/auth";
import { aiConfigured } from "@/lib/ai";
import { emailConfigured } from "@/lib/email";
import { stripeConfigured } from "@/lib/stripe";
import { safeOrigin, parseJson } from "@/lib/api";
import { requireHost } from "@/lib/session";
import { getUser, listProperties, setNotifyEmail } from "@/lib/repo";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = { accounts: authConfigured(), ai: aiConfigured(), stripe: stripeConfigured(), email: emailConfigured() };
  if (!services.accounts) return NextResponse.json({ services, user: null });
  const session = await auth();
  const user = session?.user?.id ? await getUser(session.user.id) : null;
  if (!user) return NextResponse.json({ services, user: null });
  return NextResponse.json({
    services,
    user: { ...user, notifyEmail: user.notifyEmail ?? true, image: session?.user?.image ?? null },
    properties: await listProperties(user.id),
  });
}
const settingsSchema = z.object({ notifyEmail: z.boolean() });
/** Host settings: currently the email-notification switch. */
export async function PATCH(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  let parsed;
  try {
    parsed = settingsSchema.safeParse(parseJson(await request.text()));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  await setNotifyEmail(host.user.id, parsed.data.notifyEmail);
  return NextResponse.json({ notifyEmail: parsed.data.notifyEmail });
}
