import { test, expect } from "@playwright/test";

test("WhatsApp sales demo shares the actual Casa Serena sample guide without sending", async ({ page }) => {
  await page.goto("/demo/whatsapp");

  await expect(page.getByRole("heading", { name: /A warmer welcome, delivered by WhatsApp/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try sharing Casa Serena" })).toBeVisible();

  const guestGuideInput = page.getByLabel("Sample guest-guide URL");
  await expect(guestGuideInput).toHaveValue(/^https?:\\/\\//);
  const sampleUrl = new URL(await guestGuideInput.inputValue());
  expect(sampleUrl.pathname).toBe("/g/casa-serena");
  expect(sampleUrl.origin).toBe(new URL(page.url()).origin);

  const whatsApp = page.getByRole("link", { name: "Open WhatsApp composer" });
  const href = await whatsApp.getAttribute("href");
  expect(href).toBeTruthy();
  const wa = new URL(href!);
  expect(wa.hostname).toBe("wa.me");
  expect(wa.searchParams.get("text")).toContain(sampleUrl.toString());
  expect(wa.searchParams.get("text")).toContain("This is a demonstration");
  await expect(page.getByRole("img", { name: /QR code opening the Casa Serena sample guest guide/ })).toBeVisible();

  await page.locator("details").filter({ hasText: "A lovely arrival" }).locator("summary").click();
  await expect(page.getByText(/Check-in is from/).last()).toBeVisible();
  await expect(page.getByText(/does not send anything automatically/)).toBeVisible();
});

test("WhatsApp sales demo is mobile responsive", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/whatsapp");
  await expect(page.getByRole("link", { name: "Open WhatsApp composer" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code opening/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
