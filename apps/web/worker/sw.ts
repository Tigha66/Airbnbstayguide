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

const worker = new Serwist({
  precacheEntries: [{ url: "/offline.html", revision: "2" }],
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
