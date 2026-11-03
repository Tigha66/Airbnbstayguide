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

test("an independently translated welcome survives a full guide failure", async ({ page }) => {
  const welcome = "Bienvenido a nuestro alojamiento. Todo está preparado para su estancia.";
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es&scope=welcome", (route) =>
    route.fulfill({ status: 200, json: { translated: true, scope: "welcome", description: welcome } }),
  );
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es", (route) =>
    route.fulfill({ status: 503, json: { error: "Translation unavailable", code: "TRANSLATION_UNAVAILABLE" } }),
  );
  await page.goto("/g/casa-serena");
  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  await expect(page.getByText(welcome, { exact: true })).toBeVisible();
  await expect(page.getByText(/No se ha podido traducir toda la información/)).toBeVisible();
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toHaveCount(0);
});

test("guest language and approved welcome persist through reload and a provider outage", async ({ page }) => {
  const translatedWelcome = "Bienvenido a nuestro alojamiento. Aquí encontrarás información útil para tu estancia.";
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es&scope=welcome", (route) =>
    route.fulfill({ status: 200, json: { translated: true, scope: "welcome", description: translatedWelcome } }),
  );
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es", (route) =>
    route.fulfill({ status: 503, json: { code: "TRANSLATION_UNAVAILABLE" } }),
  );
  await page.goto("/g/casa-serena");
  await page.locator("select.guest-language").selectOption("es");
  await expect(page.getByText(translatedWelcome, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/[?&]lang=es(?:&|$)/);
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toHaveCount(0);

  // A failed live request after reload must not wipe the last safe translation.
  await page.reload();
  await expect(page.locator("select.guest-language")).toHaveValue("es");
  await expect(page.getByText(translatedWelcome, { exact: true })).toBeVisible();
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toHaveCount(0);

  // Switching languages and back must restore the source-matched saved welcome.
  await page.route("**/api/v1/guides/casa-serena/translation?lang=de**", (route) =>
    route.fulfill({ status: 503, json: { code: "TRANSLATION_UNAVAILABLE" } }),
  );
  await page.locator("select.guest-language").selectOption("de");
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toHaveCount(0);
  await page.locator("select.guest-language").selectOption("es");
  await expect(page.getByText(translatedWelcome, { exact: true })).toBeVisible();
});

test("a failed guest translation shows an honest message in Spanish", async ({ page }) => {
  await page.route("**/api/v1/guides/casa-serena/translation?lang=es", (route) =>
    route.fulfill({ status: 503, json: { error: "Translation temporarily unavailable", code: "TRANSLATION_UNAVAILABLE" } }),
  );
  await page.goto("/g/casa-serena");
  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  await expect(page.getByText(/No se ha podido traducir toda la información/)).toBeVisible();
  // Failed translation cannot silently masquerade as Spanish using English text.
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver original" }).first().click();
  await expect(page.getByText("Sunlit mornings. Slow afternoons. Your own little corner of Lisbon.", { exact: true })).toBeVisible();
});
