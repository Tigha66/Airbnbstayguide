import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { analytics } from "@/lib/repo";
export const dynamic = "force-dynamic";
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  return NextResponse.json(await analytics(host.user.id));
}
