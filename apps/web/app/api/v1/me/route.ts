import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { aiConfigured } from "@/lib/ai";
import { getUser, listProperties } from "@/lib/repo";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = { accounts: authConfigured(), ai: aiConfigured() };
  if (!services.accounts) return NextResponse.json({ services, user: null });
  const session = await auth();
  const user = session?.user?.id ? await getUser(session.user.id) : null;
  if (!user) return NextResponse.json({ services, user: null });
  return NextResponse.json({
    services,
    user: { ...user, image: session?.user?.image ?? null },
    properties: await listProperties(user.id),
  });
}
