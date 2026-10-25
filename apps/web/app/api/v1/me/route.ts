import { NextResponse } from "next/server";
import { authConfigured } from "@/auth";
import { aiConfigured } from "@/lib/ai";
import { listProperties } from "@/lib/repo";
import { requireHost } from "@/lib/session";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = { accounts: authConfigured(), ai: aiConfigured() };
  if (!services.accounts) return NextResponse.json({ services, user: null });
  const host = await requireHost();
  if ("response" in host) return NextResponse.json({ services, user: null });
  const user = host.user;
  return NextResponse.json({
    services,
    user: { ...user, image: null },
    properties: await listProperties(user.id),
  });
}
