import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { consumeRateLimit, exportUserData } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** "Download my data": a JSON file with everything stored about the signed-in host. Read-only. */
export async function GET() {
  const host = await requireHost();
  if ("response" in host) return host.response;
  if (!(await consumeRateLimit(`export:${host.user.id}`, 5, 3600)))
    return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  const data = await exportUserData(host.user.id);
  if (!data) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="stayguide-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
