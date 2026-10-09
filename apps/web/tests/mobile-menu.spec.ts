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

test("dashboard pages never scroll sideways on a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/dashboard", "/dashboard/inbox", "/dashboard/extras", "/dashboard/billing", "/dashboard/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, path).toBe(client);
  }
});

test("status health check reports configuration without secrets", async ({ request }) => {
  const res = await request.get("/api/v1/status");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.services.map((s: { key: string }) => s.key)).toEqual(["database", "accounts", "ai", "payments", "email", "monitoring"]);
  expect(JSON.stringify(body)).not.toMatch(/sk_(live|test)_|whsec_|re_[A-Za-z0-9]{8}|hf_[A-Za-z0-9]{8}|postgres(ql)?:\/\//);
});
