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
const isPage = (request: Request) =>
  request.mode === "navigate" ||
  request.headers.get("accept")?.includes("text/html") === true;
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

// "/" and "/pricing" redirect phones in French, Spanish, German or Arabic to "/fr", "/fr/pricing"…,
// so only the translated page gets saved. A home-screen app always starts at "/", so offline
// we open the saved translation (the phone's language first, then any saved one).
const SITE_LOCALES = ["en", "fr", "es", "de", "ar"];
const LANGUAGE_REDIRECTED = ["/", "/pricing"];
const savedTranslation: SerwistPlugin = {
  handlerDidError: async ({ request }) => {
    const url = new URL(request.url);
    // Serwist skips its offline-screen fallback for strategies with their own handlerDidError,
    // so this plugin ends with the offline screen itself.
    const offlineScreen = async () =>
      request.destination === "document" ? worker.matchPrecache("/offline.html") : undefined;
    if (!LANGUAGE_REDIRECTED.includes(url.pathname)) return offlineScreen();
    const phone = (self.navigator.languages ?? [self.navigator.language])
      .map((tag) => tag.toLowerCase().split("-")[0])
      .filter((lang) => SITE_LOCALES.includes(lang));
    const order = [...new Set([...phone, ...SITE_LOCALES])];
    const cache = await caches.open("stayguide-site-pages-v1");
    for (const lang of order) {
      const path = lang === "en" ? url.pathname : `/${lang}${url.pathname === "/" ? "" : url.pathname}`;
      const saved = await cache.match(new URL(path, url.origin).href, { ignoreVary: true });
      // Rebuild the response so Safari accepts it for a navigation to a different URL.
      if (saved)
        return new Response(saved.body, {
          status: saved.status,
          statusText: saved.statusText,
          headers: saved.headers,
        });
    }
    return offlineScreen();
  },
};

const worker = new Serwist({
  precacheEntries: [{ url: "/offline.html", revision: "4" }],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Guest guides: the page guests need when they arrive with no signal.
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith("/g/") &&
        isPage(request) &&
        !isRsc(request, url),
      handler: new NetworkFirst({
        cacheName: "stayguide-public-guides-v1",
        networkTimeoutSeconds: 3,
        matchOptions: { ignoreVary: true },
        plugins: [
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
        cacheName: "stayguide-site-pages-v1",
        networkTimeoutSeconds: 3,
        matchOptions: { ignoreVary: true },
        plugins: [
          savedTranslation,
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
  // A page that was never opened online shows a friendly offline screen.
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});
worker.addEventListeners();
// API responses and private dashboard/admin pages are never cached.
