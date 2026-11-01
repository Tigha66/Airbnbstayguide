import { NextResponse, type NextRequest } from "next/server";
import { preferredSiteLocale } from "./lib/locale-negotiation";

/** Sends first-time visitors of "/" and "/pricing" to their language's version (e.g. /fr). */
export function proxy(request: NextRequest) {
  if (request.method !== "GET") return;
  const pathname = request.nextUrl.pathname;
  // The root HTML element needs the actual locale of an explicit translated URL.
  const explicit = pathname.match(/^\\/(fr|es|de|ar)(?:\\/|$)/)?.[1];
  if (explicit) {
    const forwarded = new Headers(request.headers);
    forwarded.set("x-stayguide-route-locale", explicit);
    return NextResponse.next({ request: { headers: forwarded } });
  }
  const locale = preferredSiteLocale(request.cookies.get("sg_lang")?.value, request.headers.get("accept-language"));
  if (locale === "en") return;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/", "/pricing", "/fr/:path*", "/es/:path*", "/de/:path*", "/ar/:path*"],
};
