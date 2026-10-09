import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { toPublicProperty } from "@stayguide/shared";
import { dbConfigured } from "@/lib/db";
import { parseJson, unavailable } from "@/lib/api";
import { consumeRateLimit, getPublishedProperty } from "@/lib/repo";
const schema = z.object({ code: z.string().trim().min(1).max(40) });
/** Constant-time compare so a mismatched length or early byte difference can't be timed. */
function codeMatches(input: string, actual: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Reveals wifiPassword/hostPhone for a guide once a guest proves they know the host's access code. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Live concierge");
  const { slug } = await params;
  let body;
  try {
    body = schema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ error: "Enter your stay code." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // Short PINs are guessable; rate-limit attempts per IP+slug separately from the chat bucket.
  const bucket = createHash("sha256").update(`${process.env.AUTH_SECRET ?? "stayguide"}:unlock:${ip}:${slug}`).digest("hex");
  if (!(await consumeRateLimit(bucket, 8, 300)))
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  if (!found) return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  if (!found.property.accessCode || !codeMatches(body.code, found.property.accessCode))
    return NextResponse.json({ error: "That code doesn't match. Please check with your host." }, { status: 403 });
  return NextResponse.json(toPublicProperty(found.property, true));
}
