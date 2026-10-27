import { NextResponse } from "next/server";
import { z } from "zod";
import { authConfigured } from "@/auth";
import { requireHost } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { setManagedPlan } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";

const schema = z.object({ email: z.email(), plan: z.enum(["hotel", "free"]) });

/** Owner only: activate or remove the Hotel & Multi-Unit plan for a host account. */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!authConfigured()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const host = await requireHost();
  const me = "user" in host ? host.user : null;
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
