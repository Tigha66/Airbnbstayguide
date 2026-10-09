import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { cronAuthorized, runRetention } from "@/lib/retention";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

/** Daily data retention (vercel.json → crons). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ skipped: "no database" });
  try {
    const result = await runRetention();
    console.info("[retention]", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[retention] failed", error);
    await reportError(error, { area: "retention" });
    return NextResponse.json({ error: "Retention failed" }, { status: 500 });
  }
}
