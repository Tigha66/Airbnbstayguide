import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { dbConfigured } from "@/lib/db";
import { consumeRateLimit, getPublishedProperty, recordView } from "@/lib/repo";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return NextResponse.json({ recorded: false });
  const { slug } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = createHash("sha256").update(`view:${ip}:${slug}`).digest("hex");
  // One counted view per visitor per guide every 30 minutes.
  if (!(await consumeRateLimit(bucket, 1, 1800))) return NextResponse.json({ recorded: false });
  const found = await getPublishedProperty(slug);
  if (found) await recordView(found.property.id);
  return NextResponse.json({ recorded: Boolean(found) });
}
