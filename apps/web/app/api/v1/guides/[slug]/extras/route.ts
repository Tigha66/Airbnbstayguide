import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { dbConfigured } from "@/lib/db";
import { parseJson, unavailable } from "@/lib/api";
import { consumeRateLimit, createExtraRequest, getPublishedProperty } from "@/lib/repo";
const schema = z.object({
  extraId: z.string().min(1).max(80),
  guestName: z.string().trim().min(2).max(120),
  guestContact: z.string().trim().min(5).max(200),
  note: z.string().max(1000).default(""),
});
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!dbConfigured()) return unavailable("Extras");
  const { slug } = await params;
  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Please add your name and an email or phone number." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(createHash("sha256").update(`extra:${ip}:${slug}`).digest("hex"), 5, 3600)))
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const found = await getPublishedProperty(slug);
  const extra = found?.property.extras.find((e) => e.id === parsed.data.extraId);
  if (!found || !extra) return NextResponse.json({ error: "This extra is no longer available." }, { status: 404 });
  const id = await createExtraRequest(found.property.id, extra, { name: parsed.data.guestName, contact: parsed.data.guestContact, note: parsed.data.note });
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
