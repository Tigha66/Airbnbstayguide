/// <reference lib="webworker" />
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";
declare const self: ServiceWorkerGlobalScope;
const worker = new Serwist({
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        url.pathname.startsWith("/g/") &&
        (request.mode === "navigate" ||
          request.headers.get("accept")?.includes("text/html") === true),
      handler: new NetworkFirst({
        cacheName: "stayguide-public-guides-v1",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 604800 }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/")),
      handler: new CacheFirst({
        cacheName: "stayguide-assets-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 2592000 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => url.hostname === "images.unsplash.com",
      handler: new CacheFirst({
        cacheName: "stayguide-photos-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 604800 }),
        ],
      }),
    },
  ],
});
worker.addEventListeners();
// Only public guest pages/assets are cached. Never cache API responses or host data.
