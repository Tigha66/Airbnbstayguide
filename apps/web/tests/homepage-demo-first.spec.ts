import { test, expect } from "@playwright/test";

test("desktop homepage lets prospects try the sample and request a walkthrough without signing up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  const hero = page.locator(".marketing-hero");
  await expect(hero.getByRole("link", { name: "Meet the guest guide" }).first()).toHaveAttribute("href", "/demo");
  const primaryCta = hero.locator("a.button").first();
  const primaryHref = await primaryCta.getAttribute("href");
  expect(["/demo", "/login?mode=register"]).toContain(primaryHref);
  await expect(page.locator(".marketing-nav nav a.button")).toHaveAttribute("href", primaryHref!);
  if (primaryHref === "/demo") await expect(page.locator('a[href="/login?mode=register"]')).toHaveCount(0);
  if (primaryHref === "/login?mode=register") {
    await primaryCta.click();
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await page.goto("/");
  }
  const section = page.locator('section[aria-labelledby="guest-demo-title"]');
  await expect(section.getByRole("heading", { name: "Try the guest experience first." })).toBeVisible();
  await expect(section.getByText("This is a sample guide, not a live WhatsApp messaging or payment demonstration.")).toBeVisible();
  const enquiryForm = section.getByRole("form");
  if (await enquiryForm.count()) {
    await expect(section.getByLabel("Name")).toBeVisible();
    await expect(section.getByLabel("Email")).toBeVisible();
    await expect(section.getByLabel("Property name")).toBeVisible();
    await expect(section.getByLabel("Property URL")).toBeVisible();
  } else {
    await expect(section.getByRole("link", { name: "Ask about a guide for my property" }))
      .toHaveAttribute("href", "mailto:abdelhaktirha@gmail.com?subject=GetStayGuide%20property%20walkthrough");
  }

  await hero.getByRole("link", { name: "Meet the guest guide" }).first().click();
  await expect(page).toHaveURL(/\/g\/casa-serena$/);
});

test("mobile homepage offers an unclipped sample-first path without a signup requirement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="guest-demo-title"]');
  await expect(section.getByRole("heading", { name: "Try the guest experience first." })).toBeVisible();
  await expect(section.getByRole("link", { name: "Meet the guest guide" })).toHaveAttribute("href", "/demo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

for (const [locale, heading] of [
  ["fr", "Essayez d’abord l’expérience voyageur."],
  ["es", "Prueba primero la experiencia del huésped."],
  ["de", "Erleben Sie zuerst die Gästeansicht."],
  ["ar", "شاهد تجربة الضيف أولاً."],
] as const) {
  test(`sample-first section is localized in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/" + locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator('section[aria-labelledby="guest-demo-title"]').getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator('section[aria-labelledby="guest-demo-title"] a[href="/demo"]')).toBeVisible();
    await expect(page.locator(".marketing")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
}
