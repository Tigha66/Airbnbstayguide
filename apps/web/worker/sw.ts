/// <reference lib="webworker" />
import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  ExpirationPlugin,
  CacheableResponsePlugin,
  type SerwistPlugin,
} from "serwist";
declare const self: ServiceWorkerGlobalScope;

// Pages that show private host data or need a live server are never cached.
const PRIVATE = ["/dashboard", "/admin", "/login", "/api", "/status"];
const isPrivate = (pathname: string) =>
  PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
// Background saves from the site (fetch with Accept: text/html). Page navigations are handled by
// handleNavigation below, not by Serwist.
const isPage = (request: Request) =>
  request.mode !== "navigate" && request.headers.get("accept")?.includes("text/html") === true;
// Next.js client navigations fetch RSC payloads, not HTML; let those go to the network.
const isRsc = (request: Request, url: URL) =>
  request.headers.has("RSC") || url.searchParams.has("_rsc");

// Next.js pages carry "Vary: rsc, next-router-state-tree, …". Safari applies Vary strictly
// when reading the cache, so saved pages could be missed offline; matchOptions ignore it.

// One cache entry per page: a guide opened from a QR code with ?utm=… or ?tab=extras
// must still load offline from the copy saved at /g/<slug>.
const ignoreQuery: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    url.search = "";
    return url.href;
  },
};

// Safari refuses a saved page that was reached through a redirect ("Response served by service
// worker has redirections") and shows its own "not connected" error. Never save redirected
// responses, and rebuild any older saved copy that still carries the redirect flag.
const safariSafe: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) =>
    response.status === 200 && !response.redirected ? response : null,
  cachedResponseWillBeUsed: async ({ cachedResponse }) =>
    cachedResponse?.redirected
      ? new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: cachedResponse.headers,
        })
      : cachedResponse,
};

const GUIDES_CACHE = "stayguide-public-guides-v1";
const SITE_CACHE = "stayguide-site-pages-v1";
const SITE_LOCALES = ["en", "fr", "es", "de", "ar"];
// "/" and "/pricing" redirect phones in French, Spanish, German or Arabic to "/fr", "/fr/pricing"…,
// so only the translated page gets saved. A home-screen app always starts at "/".
const LANGUAGE_REDIRECTED = ["/", "/pricing"];

const pageKey = (url: URL) => `${url.origin}${url.pathname}`;

/** A copy Safari will accept for any navigation (no "redirected" flag, readable body). */
const fresh = (response: Response) =>
  new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

async function savedPage(url: URL): Promise<Response | undefined> {
  const paths = [url.pathname];
  if (LANGUAGE_REDIRECTED.includes(url.pathname)) {
    const phone = (self.navigator.languages ?? [self.navigator.language])
      .map((tag) => tag.toLowerCase().split("-")[0])
      .filter((lang) => SITE_LOCALES.includes(lang));
    for (const lang of [...new Set([...phone, ...SITE_LOCALES])])
      if (lang !== "en") paths.push(`/${lang}${url.pathname === "/" ? "" : url.pathname}`);
  }
  for (const path of paths)
    for (const name of [GUIDES_CACHE, SITE_CACHE]) {
      const cache = await caches.open(name);
      const hit = await cache.match(`${url.origin}${path}`, { ignoreVary: true, ignoreSearch: true });
      if (hit) return fresh(hit);
    }
  return undefined;
}

const LAST_RESORT = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You're offline · StayGuide</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 24px;background:#f8f9f5;color:#111"><h1 style="font-size:24px">You're offline</h1><p style="color:#555">Connect to Wi-Fi or mobile data and try again.</p><button onclick="location.reload()" style="padding:14px 24px;border:0;border-radius:12px;background:#0F766E;color:#fff;font-size:16px">Try again</button></body></html>`;

async function offlineScreen(): Promise<Response> {
  const screen = await caches.match("/offline.html", { ignoreSearch: true, ignoreVary: true });
  if (screen) return fresh(screen);
  return new Response(LAST_RESORT, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/**
 * Page navigations. Written by hand (not Serwist) and without navigation preload because Safari
 * showed its own "not connected" error offline. Always answers: the live page, else the saved
 * page (or its saved translation), else the StayGuide offline screen. Never an error.
 */
async function handleNavigation(request: Request, url: URL): Promise<Response> {
  const network = fetch(request).then(async (response) => {
    // Save real pages only: not redirects (Safari rejects them later) and not error pages.
    if (response.status === 200 && response.type === "basic" && !response.redirected) {
      const copy = response.clone();
      const cacheName = url.pathname.startsWith("/g/") ? GUIDES_CACHE : SITE_CACHE;
      caches.open(cacheName).then((cache) => cache.put(pageKey(url), copy)).catch(() => {});
    }
    return response;
  });
  network.catch(() => {}); // handled below; avoids an "unhandled rejection" when the cache wins
  // Slow connection: after 4 seconds use the saved page if there is one.
  const slow = new Promise<Response | undefined>((resolve) =>
    setTimeout(() => savedPage(url).then(resolve, () => resolve(undefined)), 4000),
  );
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
    return await network;
  } catch {
    try {
      return (await savedPage(url)) ?? (await offlineScreen());
    } catch {
      return new Response(LAST_RESORT, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Login, dashboard and admin are never saved, but offline they show the StayGuide offline
  // screen instead of the browser's error page (which strands a home-screen app).
  if (isPrivate(url.pathname)) {
    event.respondWith(fetch(request).catch(() => offlineScreen()));
    return;
  }
  event.respondWith(handleNavigation(request, url));
});

// Earlier versions turned navigation preload on; it stays on until disabled.
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.navigationPreload?.disable().catch(() => {}) ?? Promise.resolve());
});

const worker = new Serwist({
  precacheEntries: [{ url: "/offline.html", revision: "8" }],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // Guest guides: the page guests need when they arrive with no signal.
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith("/g/") &&
        isPage(request) &&
        !isRsc(request, url),
      handler: new NetworkFirst({
        cacheName: GUIDES_CACHE,
        networkTimeoutSeconds: 3,
        matchOptions: { ignoreVary: true },
        plugins: [
          safariSafe,
          ignoreQuery,
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 2592000 }),
        ],
      }),
    },
    {
      // Public website pages (home, pricing, demo, blog, legal) in every language.
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        isPage(request) &&
        !isRsc(request, url) &&
        !isPrivate(url.pathname),
      handler: new NetworkFirst({
        cacheName: SITE_CACHE,
        networkTimeoutSeconds: 3,
        matchOptions: { ignoreVary: true },
        plugins: [
          safariSafe,
          ignoreQuery,
          new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 604800 }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname === "/icon.svg"),
      handler: new CacheFirst({
        cacheName: "stayguide-assets-v1",
        matchOptions: { ignoreVary: true },
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 2592000 }),
        ],
      }),
    },
    {
      // Property photos can be hosted anywhere (Unsplash, the host's own site…).
      // Cross-origin photos come back "opaque" (status 0), so allow those too.
      matcher: ({ request, url }) =>
        request.destination === "image" || url.hostname === "images.unsplash.com",
      handler: new CacheFirst({
        cacheName: "stayguide-photos-v1",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 2592000,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
});
worker.addEventListeners();
// API responses and private dashboard/admin pages are never cached.
