import { test, expect } from "@playwright/test";

test("a blocked browser storage still permits guide reading and questions", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage disabled", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage disabled", "SecurityError"); };
  });
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Concierge", exact: true }).click();
  await page.getByRole("button", { name: "When is checkout?" }).click();
  await expect(page.getByText("From your guide · Until next time")).toBeVisible();
});

test("a forged success query never confirms a payment", async ({ page }) => {
  await page.goto("/g/casa-serena?extra=success");
  await expect(page.getByRole("status")).toContainText("Payment confirmation is still pending");
  await expect(page.getByText("Your payment is confirmed. Thank you!", { exact: true })).toHaveCount(0);
});

test("receipt display waits for recorded state and distinguishes an authorization", async ({ page }) => {
  // Simulated webhook state: no provider call, card charge or real booking.
  let checks = 0;
  await page.route("**/extras/status?session_id=*", route => route.fulfill({
    json: { status: ++checks === 1 ? "processing" : "authorized" },
  }));
  await page.goto("/g/casa-serena?extra=success&session_id=cs_test_" + "A".repeat(40));
  await expect(page.getByRole("status")).toContainText("Payment confirmation is still pending");
  await expect(page.getByRole("status")).toContainText("Your card is authorized", { timeout: 10000 });
  await expect(page.getByText("Your payment is confirmed. Thank you!", { exact: true })).toHaveCount(0);
});

test("legacy translations cannot override the current guide", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("stayguide-translation-casa-serena-fr", JSON.stringify({
    description: "OUTDATED ACCESS CODE 1111", sections: [], extras: [],
  })));
  await page.goto("/g/casa-serena");
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("fr");
  await expect(page.getByRole("combobox", { name: "Langue", exact: true })).toHaveValue("fr");
  // CI has no AI provider: a rejected stale cache must show the current original.
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toBeVisible();
  await expect(page.getByText("OUTDATED ACCESS CODE 1111")).toHaveCount(0);
});

test("account recovery and verification pages are absent from offline caches", async ({ page }) => {
  await page.goto("/g/casa-serena");
  await expect(page.getByRole("heading", { name: "Casa Serena", exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  for (const path of ["/forgot-password", "/reset-password?token=fixture", "/verify-email?token=fixture"])
    await page.goto(path);
  const privatePages = await page.evaluate(async () => {
    const found: string[] = [];
    for (const name of ["stayguide-site-pages-v1", "stayguide-public-guides-v1"])
      for (const request of await (await caches.open(name)).keys())
        if (/\/(?:forgot-password|reset-password|verify-email)/.test(new URL(request.url).pathname)) found.push(request.url);
    return found;
  });
  expect(privatePages).toEqual([]);
});
