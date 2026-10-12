import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, authConfigured } from "@/auth";
import { safeOrigin, parseJson } from "@/lib/api";
import { dbConfigured } from "@/lib/db";
import { consumeRateLimit } from "@/lib/repo";
import { fetchListing } from "@/lib/listing-import";

const schema = z.object({ url: z.string().trim().min(1).max(500) });

/**
 * Pre-fills the "create a guide" form from a public Airbnb listing link.
 * Same-origin only. When accounts are configured a signed-in host is required and the
 * import is rate limited; in the browser-only demo it stays open so hosts can try it.
 */
export async function POST(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  if (authConfigured()) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Sign in to import a listing." }, { status: 401 });
    if (dbConfigured() && !(await consumeRateLimit(`import:${userId}`, 20, 3600)))
      return NextResponse.json({ error: "That’s a lot of imports — please try again a little later." }, { status: 429 });
  }

  const parsed = schema.safeParse(parseJson(await request.text()));
  if (!parsed.success) return NextResponse.json({ error: "Paste an Airbnb listing link." }, { status: 400 });

  try {
    const listing = await fetchListing(parsed.data.url);
    return NextResponse.json({ listing });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "We couldn’t import that listing." },
      { status: 422 },
    );
  }
}
