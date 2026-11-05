import { test, expect } from "@playwright/test";
import { onboardingText } from "../lib/onboarding-i18n";
for (const locale of ["en", "fr", "es", "de", "ar"] as const) {
  test(`guided tour in ${locale}: all steps, sample controls and trial terms`, async ({ page }) => {
    await page.goto(locale === "en" ? "/tour" : `/${locale}/tour`);
    const t = onboardingText[locale];
    await expect(page.locator(".tour-page")).toBeVisible();
    await expect(page.locator(".marketing")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.getByRole("textbox").fill("My sample home");
    await expect(page.locator(".tour-preview h3")).toHaveText("My sample home");
    for (let i = 0; i < 4; i++) {
      await expect(page.locator("#tour-heading")).toHaveText(t.steps[i].title);
      await page.getByRole("button", { name: t.next, exact: true }).click();
    }
    await expect(page.locator("#tour-heading")).toHaveText(t.steps[4].title);
    await page.getByRole("button", { name: t.complete, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(t.complete);
    await expect(page.locator(".tour-cta")).toContainText(t.terms);
    await expect(page.locator(".tour-cta a.button").first()).toHaveAttribute("href", "/login?mode=register");
    await page.getByRole("button", { name: t.restart }).click();
    await expect(page.getByRole("textbox")).toHaveValue("Casa Serena");
  });
}
test("phone tour fits, switches language on the same route and preserves the guest demo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tour");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("fr");
  await expect(page).toHaveURL(/\/fr\/tour$/);
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/g\//);
});
