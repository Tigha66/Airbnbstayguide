import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { inbox } from "@/lib/repo";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const thread = new URL(request.url).searchParams.get("thread");
  if (thread && !z.uuid().safeParse(thread).success) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
  return NextResponse.json({ threads: await inbox(host.user.id, thread) });
}
