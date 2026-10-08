import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, authConfigured } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getUser, setManagedPlan } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";

const schema = z.object({ email: z.email(), plan: z.enum(["hotel", "free"]) });

/** Owner only: activate or remove the Hotel & Multi-Unit plan for a host account. */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!authConfigured()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  const me = session?.user?.id ? await getUser(session.user.id) : null;
  if (!me || !isAdminEmail(me.email)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ok = await setManagedPlan(parsed.data.email, parsed.data.plan);
  if (!ok)
    return NextResponse.json(
      { error: "Account not found, or it has an active Stripe subscription (cancel that first)." },
      { status: 409 },
    );
  return NextResponse.json({ ok: true, plan: parsed.data.plan });
}
