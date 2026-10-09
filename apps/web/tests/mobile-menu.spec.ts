import { test, expect } from "@playwright/test";

test("phone visitors can open the menu and reach every page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await expect(toggle).toBeVisible();
  await expect(page.getByRole("link", { name: "Pricing" }).first()).toBeHidden();
  await toggle.click();
  for (const name of ["How it works", "Pricing", "Guest demo", "Log in", "Explore StayGuide"])
    await expect(page.locator("#site-menu").getByRole("link", { name })).toBeVisible();
  await expect(page.locator("#site-menu").getByRole("combobox", { name: "Language" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator("#site-menu").getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL("**/pricing");
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});

test("desktop shows the full menu without a menu button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  await expect(page.locator("#site-menu").getByRole("link", { name: "Pricing" })).toBeVisible();
});
