"use client";
import { useEffect } from "react";

const PRIVATE = ["/dashboard", "/admin", "/login", "/api", "/status"];

/** Saves the page a visitor is on, its code, fonts and photos, so it reopens offline. */
function warmCache() {
  const path = location.pathname;
  if (!PRIVATE.some((p) => path === p || path.startsWith(`${p}/`)))
    void fetch(path, { headers: { Accept: "text/html" } }).catch(() => {});
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
