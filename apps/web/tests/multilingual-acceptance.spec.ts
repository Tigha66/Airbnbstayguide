import { expect, test } from "@playwright/test";

const pages = [
  { code: "en", path: "/", pricing: "/pricing", direction: "ltr" },
  { code: "fr", path: "/fr", pricing: "/fr/pricing", direction: "ltr" },
  { code: "es", path: "/es", pricing: "/es/pricing", direction: "ltr" },
  { code: "de", path: "/de", pricing: "/de/pricing", direction: "ltr" },
  { code: "ar", path: "/ar", pricing: "/ar/pricing", direction: "rtl" },
] as const;

for (const locale of pages) {
  test(`marketing and pricing HTML identify ${locale.code} correctly`, async ({ page }) => {
    for (const path of [locale.path, locale.pricing]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.locator("html")).toHaveAttribute("dir", locale.direction);
      await expect(page.locator("div.marketing")).toHaveAttribute("lang", locale.code);
    }
  });
}

test("language choice persists across marketing and dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  await expect(page).toHaveURL(new RegExp("/es$"));
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.goto("/pricing");
  await expect(page).toHaveURL(new RegExp("/es/pricing$"));
  await page.goto("/dashboard");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("combobox", { name: "Idioma" }).first()).toHaveValue("es");
});

test("Arabic marketing is right-to-left at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a failed guest translation shows an honest message in Spanish", async ({ page }) => {
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es", (route) =>
    route.fulfill({ status: 503, json: { error: "Translation temporarily unavailable", code: "TRANSLATION_UNAVAILABLE" } }),
  );
  await page.goto("/g/casa-serena");
  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  await expect(page.getByText(/No se ha podido traducir toda la información/)).toBeVisible();
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toBeVisible();
});
