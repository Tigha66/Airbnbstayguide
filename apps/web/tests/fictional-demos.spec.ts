import { test, expect } from "@playwright/test";
import { fictionalDemos } from "../lib/fictional-demos";

for (const demo of fictionalDemos) {
  test(`${demo.type}: fictional guide is accessible at phone, tablet and desktop widths`, async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/demo/examples/${demo.slug}`);
      await expect(page.getByRole("heading", { name: demo.name, exact: true })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("Fictional demonstration only");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    for (const lang of ["fr", "es", "de", "ar"]) {
      await page.goto(`/demo/examples/${demo.slug}?lang=${lang}`);
      await expect(page.locator("main")).toHaveAttribute("lang", lang);
      await expect(page.locator("main")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("note")).not.toContainText("Fictional demonstration only");
      await expect(page.locator("details")).toHaveCount(6);
    }
  });
}
