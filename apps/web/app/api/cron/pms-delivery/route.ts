import { NextResponse } from "next/server";
import { cronAuthorised, deliveryAdapters, runScheduledDelivery } from "@/lib/pms-scheduler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  if (!cronAuthorised(request)) return reply({ error: "Unauthorised" }, 401);
  // Vercel only schedules production; protect manual preview invocations too.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    return reply({ error: "Scheduled delivery is unavailable on previews" }, 403);
  try {
    const result = await runScheduledDelivery(deliveryAdapters());
    return reply(result, result.status === "provider_not_connected" ? 503 : 200);
  } catch { return reply({ error: "Scheduled delivery unavailable" }, 503); }
}
