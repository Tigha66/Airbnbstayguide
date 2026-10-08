import { NextResponse, type NextRequest } from "next/server";
import { preferredSiteLocale } from "./lib/locale-negotiation";

/** Sends first-time visitors of "/" and "/pricing" to their language's version (e.g. /fr). */
export function proxy(request: NextRequest) {
  if (request.method !== "GET") return;
  const locale = preferredSiteLocale(request.cookies.get("sg_lang")?.value, request.headers.get("accept-language"));
  if (locale === "en") return;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/", "/pricing"],
};
