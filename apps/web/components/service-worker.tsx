"use client";
import { useEffect } from "react";

const PRIVATE = ["/dashboard", "/admin", "/login", "/api", "/status"];

const isPrivate = (path: string) => PRIVATE.some((p) => path === p || path.startsWith(`${p}/`));
const LOCALES = ["fr", "es", "de", "ar"];

/** Saves a page and the code/styles it needs (read from its HTML), so it reopens offline. */
async function savePage(path: string) {
  try {
    const res = await fetch(path, { headers: { Accept: "text/html" } });
    if (!res.ok || res.redirected) return;
    const html = await res.text();
    const assets = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
    // Photos shown on the page (e.g. a guide's cover), which may be on another site.
    const photos = new Set(
      [...html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")),
    );
    await Promise.all([
      ...[...assets].map((url) => fetch(url).catch(() => {})),
      ...[...photos].map((url) => fetch(url, { mode: "no-cors" }).catch(() => {})),
    ]);
  } catch {
    /* offline or blocked: try again on the next visit */
  }
}

/**
 * Saves the page a visitor is on, its code, fonts and photos, plus the main website pages in
 * their language, so the site (and a home-screen app, which starts at "/") reopens offline.
 */
function warmCache() {
  const path = location.pathname;
  if (!isPrivate(path)) void savePage(path);
  let savedThisSession = false;
  try {
    savedThisSession = sessionStorage.getItem("stayguide-pages-saved") === "1";
    sessionStorage.setItem("stayguide-pages-saved", "1");
  } catch {
    /* storage unavailable */
  }
  if (!savedThisSession && !path.startsWith("/g/") && !isPrivate(path)) {
    const first = path.split("/")[1];
    const base = LOCALES.includes(first) ? `/${first}` : "";
    // "/demo" forwards to the sample guide, so save that guide too.
    for (const page of [base || "/", `${base}/pricing`, "/demo", "/g/casa-serena"])
      if (page !== path) void savePage(page);
  }
  const seen = new Set<string>();
  for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    const url = entry.name;
    if (seen.has(url)) continue;
    seen.add(url);
    const sameOrigin = url.startsWith(location.origin);
    const asset = sameOrigin && (url.includes("/_next/static/") || url.includes("/icons/"));
    const image = entry.initiatorType === "img" || url.includes("images.unsplash.com");
    if (!asset && !image) continue;
    void fetch(url, { mode: sameOrigin ? "same-origin" : "no-cors" }).catch(() => {});
  }
}

/** Registers the offline service worker for the whole public site and guest guides. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV === "test") return;
    let cancelled = false;
    (async () => {
      try {
        // Older versions registered only for /g/; one site-wide worker replaces it.
        for (const old of await navigator.serviceWorker.getRegistrations())
          if (new URL(old.scope).pathname !== "/") await old.unregister();
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        if (cancelled) return;
        if (navigator.serviceWorker.controller) warmCache();
        else
          navigator.serviceWorker.addEventListener("controllerchange", warmCache, {
            once: true,
          });
      } catch {
        /* unsupported or blocked (private mode): the site still works online */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
