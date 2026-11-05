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


test("existing paid hosts see the tutorial and an explanation of trial eligibility immediately after login", async ({ page }) => {
  await page.route("**/api/v1/me", route => route.fulfill({ json: { services: { accounts: true, ai: false }, user: { id: "paid-host", name: "Paid Host", email: "paid@example.test", plan: "pro", emailVerified: true, trialActive: false, trialEndsAt: null }, properties: [] } }));
  await page.goto("/dashboard");
  const welcome = page.getByRole("region", { name: "How to use StayGuide" });
  await expect(welcome.getByRole("link", { name: "How to use StayGuide", exact: true })).toBeVisible();
  await expect(welcome).toContainText("there is no trial to start on this account");
  await expect(welcome).toContainText("Current plan: Pro");
  await welcome.getByRole("link", { name: "How to use StayGuide", exact: true }).click();
  await expect(page).toHaveURL(/\/tour$/);
});

test("new trial hosts see automatic activation and the tutorial on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/me", route => route.fulfill({ json: { services: { accounts: true, ai: false }, user: { id: "trial-host", name: "Trial Host", email: "trial@example.test", plan: "pro", emailVerified: true, trialActive: true, trialEndsAt: "2026-11-19T00:00:00Z" }, properties: [] } }));
  await page.goto("/dashboard");
  const welcome = page.getByRole("region", { name: "How to use StayGuide" });
  await expect(welcome).toContainText("Your trial starts automatically at signup");
  await expect(welcome.getByRole("link", { name: "How to use StayGuide", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Your 14-day Pro trial" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


for (const account of ["paid", "active-trial", "unverified-trial", "existing-free"] as const) {
  test(`Plans & billing always shows the 14-day trial card for ${account}`, async ({ page }) => {
    const trial = account === "active-trial" || account === "unverified-trial";
    const verified = account !== "unverified-trial";
    const plan = account === "paid" || account === "active-trial" ? "pro" : "free";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/v1/me", route => route.fulfill({ json: { services: { accounts: true, ai: false }, user: { id: "billing-fixture", name: "Billing Host", email: "billing@example.test", plan, emailVerified: verified, trialActive: trial && verified, trialEndsAt: trial ? "2026-11-19T00:00:00Z" : null }, properties: [] } }));
    await page.route("**/api/v1/billing", route => route.fulfill({ json: { stripe: true, plan, status: account === "paid" ? "active" : null, subscribed: account === "paid", trial: { active: trial && verified, endsAt: trial ? "2026-11-19T00:00:00Z" : null, days: 14, propertyLimit: 1 }, propertyCount: 0, billableQuantity: 1, payouts: { started: false, ready: false } } }));
    await page.goto("/dashboard/billing");
    const card = page.getByRole("region", { name: "14-day free trial", exact: true });
    await expect(card).toBeVisible();
    await expect(card).toContainText("$0");
    await expect(card).toContainText("No credit card. No automatic charge.");
    await expect(card.getByRole("link", { name: "How to use StayGuide", exact: true })).toBeVisible();
    if (account === "paid") await expect(card).toContainText("there is no trial to start on this account");
    if (account === "existing-free") await expect(card).toContainText("has no active trial");
    if (account === "active-trial") { await expect(card).toContainText("Your 14-day Pro trial"); await expect(card).toContainText("19 November 2026"); }
    if (account === "unverified-trial") await expect(card.getByRole("link", { name: "Verify your email to activate your trial.", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
