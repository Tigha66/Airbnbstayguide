import { NextResponse } from "next/server";
import { staySchema } from "@stayguide/shared";
import { requireHost } from "@/lib/session";
import { createStay, listStays } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Ctx) {
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  return NextResponse.json({ stays: await listStays(host.user.id, id) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request, { params }: Ctx) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const { id } = await params;
  let input;
  try {
    input = staySchema.parse(parseJson(await request.text()));
  } catch {
    return NextResponse.json({ error: "Please add the guest name and valid stay dates." }, { status: 400 });
  }
  const stay = await createStay(host.user.id, id, input);
  return stay ? NextResponse.json({ stay }, { status: 201 }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
