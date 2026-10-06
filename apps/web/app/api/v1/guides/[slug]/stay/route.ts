import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { dbConfigured } from "@/lib/db";
import { parseJson, unavailable } from "@/lib/api";
import { consumeRateLimit, getStayAccess } from "@/lib/repo";
const bodySchema = z.object({ token: z.string().min(1).max(100) });
const noStore = { "Cache-Control": "no-store" };
/** Guests exchange their private stay token for door codes etc. POST keeps the token out of URLs and logs. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Private stay details");
  const { slug } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = createHash("sha256").update(`stay:${process.env.AUTH_SECRET ?? "stayguide"}:${ip}`).digest("hex");
  if (!(await consumeRateLimit(bucket, 20, 600)))
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: noStore });
  let body;
  try {
    body = bodySchema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ status: "invalid" }, { status: 400, headers: noStore });
  }
  const access = await getStayAccess(slug, body.token);
  return NextResponse.json(access, { status: access.status === "invalid" ? 404 : 200, headers: noStore });
}
