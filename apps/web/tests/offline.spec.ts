import { test, expect, type Page } from "@playwright/test";

async function waitForSavedPage(page: Page, path: string, cache: string) {
  await expect.poll(() => page.evaluate(async ({ cache, path }) => {
    const response = await (await caches.open(cache)).match(path, { ignoreVary: true });
    if (!response) return false;
    const html = new DOMParser().parseFromString(await response.text(), "text/html");
    const assets = [...html.querySelectorAll("script[src], link[href]")]
      .map((el) => new URL(el.getAttribute("src") ?? el.getAttribute("href")!, location.origin))
      .filter((url) => url.pathname.startsWith("/_next/static/"));
    for (const script of html.querySelectorAll("script:not([src])"))
      for (const asset of script.textContent.match(/\/_next\/static\/[^"'\\\s<>]+/g) ?? [])
        assets.push(new URL(asset, location.origin));
    return (await Promise.all(assets.map((url) => caches.match(url.href, { ignoreVary: true })))).every(Boolean);
  }, { cache, path }), { timeout: 20000 }).toBe(true);
}

/** Visit a page online and wait until the service worker controls it and has saved it. */
async function saveForOffline(page: Page, path: string, cache: string) {
  await page.goto(path);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
      );
  });
  await waitForSavedPage(page, path, cache);
}

test("guest guide opens offline, including from a QR link with extra parameters", async ({ page, context }) => {
  await saveForOffline(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await context.setOffline(true);
  await page.goto("/g/casa-serena?utm_source=qr&tab=extras");
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible();
  await expect(page.getByText("You’re offline. Your saved guide is still here.")).toBeVisible();
});

test("guest guide cover photo is still shown offline", async ({ page, context }) => {
  await saveForOffline(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await expect.poll(() => page.evaluate(async () => (await (await caches.open("stayguide-photos-v1")).keys()).length > 0), {
    timeout: 20000,
  }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  const cover = page.getByRole("img", { name: "Casa Serena" }).first();
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test("website pages visited online open offline", async ({ page, context }) => {
  await saveForOffline(page, "/pricing", "stayguide-site-pages-v1");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Guest demo" }).first()).toBeVisible();
});

test("a page reached through client navigation is saved for offline", async ({ page, context }) => {
  await saveForOffline(page, "/", "stayguide-site-pages-v1");
  await page.locator('a[href="/legal/privacy"]').first().click();
  await page.waitForURL("**/legal/privacy");
  await waitForSavedPage(page, "/legal/privacy", "stayguide-site-pages-v1");
  const title = await page.title();
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(title);
  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
});

test("a page never opened online shows the offline screen with saved guides", async ({ page, context }) => {
  await saveForOffline(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await context.setOffline(true);
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole("img", { name: "StayGuide" })).toBeVisible();
  await page.getByRole("link", { name: "Casa Serena", exact: true }).click();
  await page.waitForURL("**/g/casa-serena", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible({ timeout: 15000 });
});

test("private dashboard pages are never saved for offline", async ({ page }) => {
  await saveForOffline(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await page.goto("/dashboard");
  await page.evaluate(() => fetch("/dashboard", { headers: { Accept: "text/html" } }));
  const saved = await page.evaluate(async () => {
    const hits = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        if (new URL(request.url).pathname.startsWith("/dashboard")) hits.push(request.url);
    return hits;
  });
  expect(saved).toEqual([]);
});

test.describe("phone in French", () => {
  test.use({ locale: "fr-FR" });
  test("home screen app (which starts at /) opens offline on a non-English phone", async ({ page, context }) => {
    // "/" redirects French phones to "/fr", so only "/fr" is saved.
    await saveForOffline(page, "/fr", "stayguide-site-pages-v1");
    await context.setOffline(true);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
    await expect(page.locator("h1").first()).toContainText("Moins de gestion");
  });
});

test("main website pages are saved even if the visitor only opened one page", async ({ page, context }) => {
  await saveForOffline(page, "/pricing", "stayguide-site-pages-v1");
  await waitForSavedPage(page, "/", "stayguide-site-pages-v1");
  await waitForSavedPage(page, "/demo", "stayguide-site-pages-v1");
  await waitForSavedPage(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
  await expect(page.locator("h1").first()).toContainText("Less managing");
  // "Guest demo" forwards to the sample guide, which was saved too.
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible({ timeout: 15000 });
});

test("offline check page reports the installed offline support", async ({ page }) => {
  await saveForOffline(page, "/g/casa-serena", "stayguide-public-guides-v1");
  await page.goto("/offline-check.html");
  await expect(page.getByText("Pages saved for offline")).toBeVisible();
  await expect(page.locator("td", { hasText: "/g/casa-serena" })).toBeVisible();
});

test("menu links work offline and never rely on Next.js data requests", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await saveForOffline(page, "/", "stayguide-site-pages-v1");
  await waitForSavedPage(page, "/pricing", "stayguide-site-pages-v1");
  await context.setOffline(true);
  const dataRequests: string[] = [];
  page.on("request", (r) => {
    const h = r.headers();
    // Background prefetches of visible links are harmless; count only navigation data requests.
    if (h["next-router-prefetch"] || h["next-router-segment-prefetch"]) return;
    if (r.url().includes("_rsc=") || h["rsc"]) dataRequests.push(r.url());
  });
  for (const [name, title] of [
    ["Pricing", /pricing/i],
    ["Log in", /offline/i],
  ] as const) {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("#site-menu").getByRole("link", { name }).click();
    await expect(page).toHaveTitle(title, { timeout: 15000 });
  }
  expect(dataRequests).toEqual([]);
  // On the offline screen for Log in: an honest message, a way home and the saved pages.
  await expect(page.getByText("need an internet connection")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pricing" })).toBeVisible();
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page.locator("h1").first()).toContainText("Less managing", { timeout: 15000 });
});
