import { expect, test } from "@playwright/test";

test("homepage promotes the $49 offer and a free sample request", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator("#founding-five");
  await expect(card.getByText("$49 USD · one-time")).toBeVisible();
  const sample = card.getByRole("link", { name: "Request a free personalised sample" });
  await expect(sample).toHaveAttribute("href", "/sample?lang=en");
  await sample.click();
  await expect(page).toHaveURL(/\/sample\?lang=en$/);
  await expect(page.getByRole("heading", { name: "A free sample, shaped around your property." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test("sample request validates fields and shows a manual review confirmation", async ({ page }) => {
  await page.route("**/api/walkthrough", async route => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ received: true }) });
  });
  await page.goto("/sample?lang=en");
  await page.getByLabel("Your name").fill("QA Host");
  await page.getByLabel("Email address").fill("qa@example.com");
  await page.getByLabel("Property name").fill("QA Cottage");
  await page.getByLabel("Property website (HTTPS)").fill("https://example.com/cottage");
  await page.getByRole("button", { name: "Request my free sample" }).click();
  await expect(page.getByRole("status")).toContainText("Request received. We’ll review it manually.");
});

test("Arabic sample request uses right-to-left layout and translated labels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sample?lang=ar");
  await expect(page.locator(".marketing")).toHaveAttribute("dir", "rtl");
  await expect(page.getByLabel("اسمك")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
