import { test, expect } from "@playwright/test";

const candidates = [
  { slug: "dinas-ddu", name: "Dinas-Ddu" },
  { slug: "isaacs-cottage", name: "Isaac's Cottage" },
  { slug: "rose-suite", name: "The Rose Suite" },
  { slug: "the-salt-lodge", name: "The Salt Lodge" },
  { slug: "harveys-corner-cottage", name: "Harvey’s Corner Cottage" },
  { slug: "fernwood-libbys-place", name: "Libby’s Place" },
  { slug: "cornish-escapes-artist-cottage", name: "Artist Cottage" },
  { slug: "cotswold-laburnum-cottage", name: "Laburnum Cottage" },
  { slug: "cumbrian-anley-cottage", name: "Anley Cottage" },
  { slug: "cotswold-gems-greystones-cottage", name: "Greystones Cottage" },
] as const;

test("all independent concept previews are discoverable", async ({ page }) => {
  await page.goto("/demo/previews");
  await expect(page.getByRole("heading", { name: /Show the guest experience/ })).toBeVisible();
  for (const sample of candidates) {
    await expect(page.locator('a[href="/demo/preview/' + sample.slug + '"]')).toBeVisible();
  }
});

for (const sample of candidates) {
  test(sample.name + ": mobile concept includes QR, transparent WhatsApp and operator source", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo/preview/" + sample.slug);
    await expect(page.getByRole("heading", { name: sample.name, exact: true })).toBeVisible();
    await expect(page.getByText(/not an official guide or endorsed/)).toBeVisible();

    const url = await page.getByRole("textbox", { name: "Shareable concept preview URL" }).inputValue();
    expect(new URL(url).pathname).toBe("/demo/preview/" + sample.slug);
    expect(new URL(url).origin).toBe(new URL(page.url()).origin);

    await expect(page.getByRole("img", { name: /QR code linking to the independent/ })).toBeVisible();
    const wa = page.getByRole("link", { name: "Open WhatsApp composer" });
    const href = await wa.getAttribute("href");
    expect(href).toBeTruthy();
    const parsed = new URL(href!);
    expect(parsed.hostname).toBe("wa.me");
    expect(parsed.searchParams.get("text")).toContain(url);
    expect(parsed.searchParams.get("text")).toContain("not an official property guide");
    await expect(page.getByText(/No messages are sent automatically/)).toBeVisible();
    await page.locator("details").nth(1).locator("summary").click();
    await expect(page.locator("details").nth(1)).toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
