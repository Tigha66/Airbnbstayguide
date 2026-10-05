import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConfigured } from "@/lib/db";
import { unavailable } from "@/lib/api";
import { getPublishedProperty, threadMessages } from "@/lib/repo";
export const dynamic = "force-dynamic";
/** Guests poll their own thread (the random thread id acts as the capability) to see host replies. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  if (!dbConfigured()) return unavailable("Chat");
  const { slug, threadId } = await params;
  if (!z.uuid().safeParse(threadId).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const found = await getPublishedProperty(slug);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await threadMessages(found.property.id, threadId);
  return NextResponse.json({ messages: messages.map((m) => ({ role: m.role, content: m.content, citations: m.citations })) });
}
