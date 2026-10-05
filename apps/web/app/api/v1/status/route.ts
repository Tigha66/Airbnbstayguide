import { NextResponse } from "next/server";
import { serviceStatus } from "@/lib/status";
export const dynamic = "force-dynamic";
export async function GET() {
  const services = await serviceStatus();
  return NextResponse.json({ ok: services.every((s) => s.ok), services });
}
