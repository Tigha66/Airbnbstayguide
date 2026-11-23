import { test, expect } from "@playwright/test";

test("desktop homepage lets prospects try the sample and request a walkthrough without signing up", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const hero = page.locator(".marketing-hero");
  await expect(hero.getByRole("link", { name: "Meet the guest guide" })).toHaveAttribute("href", "/demo");
  await expect(hero.getByRole("link", { name: "Start your 14-day free trial" })).toHaveAttribute("href", "/login?mode=register");
  const section = page.locator('section[aria-labelledby="guest-demo-title"]');
  await expect(section.getByRole("heading", { name: "Try the guest experience first." })).toBeVisible();
  await expect(section.getByText("This is a sample guide, not a live WhatsApp messaging or payment demonstration.")).toBeVisible();
  await expect(section.getByRole("link", { name: "Ask about a guide for my property" }))
    .toHaveAttribute("href", "mailto:abdelhaktirha@gmail.com?subject=GetStayGuide%20property%20walkthrough");

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
    await expect(page.locator('section[aria-labelledby="guest-demo-title"]').getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator('section[aria-labelledby="guest-demo-title"] a[href="/demo"]')).toBeVisible();
    await expect(page.locator(".marketing")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  });
}
