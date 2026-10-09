"use client";
import { useEffect } from "react";

const PRIVATE = ["/dashboard", "/admin", "/login", "/api", "/status"];

const isPrivate = (path: string) => PRIVATE.some((p) => path === p || path.startsWith(`${p}/`));
const LOCALES = ["fr", "es", "de", "ar"];

/**
 * Background fetches for the offline copy go through a small queue (4 at a time), so they never
 * compete with the page itself; hundreds of parallel requests exhaust the browser's connections.
 */
const queue: (() => Promise<unknown>)[] = [];
let running = 0;
function pump() {
  while (running < 4 && queue.length) {
    const job = queue.shift()!;
    running++;
    void job()
      .catch(() => {})
      .finally(() => {
        running--;
        pump();
      });
  }
}
function background<T>(job: () => Promise<T>): Promise<T | undefined> {
  return new Promise((resolve) => {
    queue.push(() => job().then(resolve, () => resolve(undefined)));
    pump();
  });
}
const save = (url: string, init?: RequestInit) => background(() => fetch(url, init));

/** Saves a page and the code/styles it needs (read from its HTML), so it reopens offline. */
async function savePage(path: string) {
  try {
    const res = await background(() => fetch(path, { headers: { Accept: "text/html" } }));
    if (!res) return;
    if (!res.ok || res.redirected) return;
    const html = await res.text();
    const assets = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
    // Photos shown on the page (e.g. a guide's cover), which may be on another site.
    const photos = new Set(
      [...html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")),
    );
    await Promise.all([
      ...[...assets].map((url) => save(url)),
      ...[...photos].map((url) => save(url, { mode: "no-cors" })),
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
    void save(url, { mode: sameOrigin ? "same-origin" : "no-cors" });
  }
}

/**
 * Offline, Next.js links fetch a data file for the next page instead of the page itself; that
 * fails (iPhone home-screen apps then do nothing). While offline, make same-site links load the
 * whole page, which the service worker serves from the saved copy or the offline screen.
 */
function loadWholePagesWhileOffline(event: MouseEvent) {
  if (navigator.onLine || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.("a");
  if (!link || !link.href || link.target === "_blank" || link.hasAttribute("download")) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  // Jumping within the same page (e.g. "/#how-it-works" from "/") needs no network.
  if (url.pathname === location.pathname && url.hash) return;
  event.preventDefault();
  event.stopPropagation();
  location.assign(url.href);
}

/** Registers the offline service worker for the whole public site and guest guides. */
export function ServiceWorker() {
  useEffect(() => {
    // Capture phase, so it runs before Next.js handles the link.
    document.addEventListener("click", loadWholePagesWhileOffline, true);
    return () => document.removeEventListener("click", loadWholePagesWhileOffline, true);
  }, []);
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
        // Save for offline only once the page has finished loading and the browser is idle.
        const warmWhenIdle = () => {
          const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 1500));
          const start = () => idle(() => warmCache(), { timeout: 5000 });
          if (document.readyState === "complete") start();
          else window.addEventListener("load", start, { once: true });
        };
        if (navigator.serviceWorker.controller) warmWhenIdle();
        else
          navigator.serviceWorker.addEventListener("controllerchange", warmWhenIdle, {
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
