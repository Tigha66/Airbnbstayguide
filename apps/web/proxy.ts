import { NextRequest, NextResponse } from "next/server";
import { preferredSiteLocale } from "./lib/locale-negotiation";
import { isSiteLocale, type SiteLocale } from "./lib/site-i18n";

/** Preserves language negotiation and gives the root document its route locale. */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (request.method === "GET" && ["/", "/pricing", "/tour"].includes(pathname)) {
    const preferred = preferredSiteLocale(request.cookies.get("sg_lang")?.value, request.headers.get("accept-language"));
    if (preferred !== "en") {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url, 307);
    }
  }
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "en";
  const locale: SiteLocale = isSiteLocale(firstSegment) ? firstSegment : "en";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-stayguide-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/pricing", "/tour", "/fr/:path*", "/es/:path*", "/de/:path*", "/ar/:path*"],
};
