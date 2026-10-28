import { test, expect, type Page } from "@playwright/test";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
async function managerSession(page: Page) {
  // UI fixtures only. Database authorization is tested separately with PGlite.
  await page.route("**/api/v1/me", route => route.fulfill({ json: {
    services: { accounts: true, ai: true },
    user: { id: first, name: "Manager Test", email: "manager@test.local", plan: "pro", managerAccess: true, emailVerified: true }, properties: [],
  } }));
}

test("Manager edits disable a rule and previews never mutate the queue", async ({ page }) => {
  await managerSession(page);
  let rule = { id: first, keyword: "water leak", label: "Maintenance", priority: "urgent", enabled: true };
  let mutations = 0;
  await page.route("**/api/v1/manager", route => route.fulfill({ json: { rules: [rule], templates: [], triage: [] } }));
  await page.route(`**/api/v1/manager/rules/${first}`, async route => {
    mutations++;
    expect(route.request().method()).toBe("PATCH");
    rule = { ...rule, ...route.request().postDataJSON(), enabled: false };
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/dashboard/manager");
  await expect(page.getByRole("heading", { name: "StayGuide Manager", exact: true })).toBeVisible();
  await expect(page.getByText("Manager feature access is enabled for your account.", { exact: false })).toBeVisible();
  await page.getByLabel("Test a guest message").fill("There is a WATER LEAK");
  await expect(page.getByRole("status").filter({ hasText: "Matches Maintenance" })).toBeVisible();
  expect(mutations).toBe(0);
  await page.getByRole("button", { name: "Edit rule", exact: true }).click();
  await page.getByLabel("Guest message keyword").fill("heating");
  await page.getByRole("button", { name: "Update rule", exact: true }).click();
  await expect(page.getByLabel("Enabled", { exact: true })).not.toBeChecked();
  await page.getByLabel("Test a guest message").fill("heating");
  await expect(page.getByRole("status").filter({ hasText: "No enabled rule matches" })).toBeVisible();
  expect(mutations).toBe(1);
});

test("inbox isolates drafts, preserves failed sends and loads deep links", async ({ page }) => {
  await managerSession(page);
  const threads = [first, second].map((threadId, i) => ({
    threadId, propertyId: `property-${i}`, propertyName: `Cottage ${i + 1}`, escalated: true,
    lastAt: "2026-10-27T10:00:00Z", messages: [{ role: "guest", content: `Question ${i + 1}`, createdAt: "2026-10-27T10:00:00Z" }],
  }));
  await page.route("**/api/v1/inbox**", route => route.fulfill({ json: { threads } }));
  await page.route("**/api/v1/manager/templates", route => route.fulfill({ json: { templates: [{ id: first, title: "Check-out", body: "Check out by 11." }] } }));
  await page.goto(`/dashboard/inbox?thread=${first}`);
  const reply = page.getByRole("textbox", { name: "Reply to guest", exact: true });
  await expect(reply).toBeVisible();
  await page.getByLabel("Insert saved reply").selectOption(first);
  await expect(reply).toHaveValue("Check out by 11.");
  await page.locator(".thread-item").filter({ hasText: "Cottage 2" }).click();
  await expect(reply).toHaveValue("");
  await reply.fill("Only for Cottage 2");
  await page.locator(".thread-item").filter({ hasText: "Cottage 1" }).click();
  await expect(reply).toHaveValue("Check out by 11.");
  await page.route(`**/api/v1/inbox/${first}`, route => route.abort());
  await page.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send reply", exact: true })).toBeEnabled();
  await expect(reply).toHaveValue("Check out by 11.");
});

test("Manager workspace fits a phone and queue filters separate resolved issues", async ({ page }) => {
  await managerSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/manager", route => route.fulfill({ json: { rules: [], templates: [], triage: [
    { threadId: first, propertyName: "Open Cottage", label: "Maintenance", priority: "urgent", status: "open", updatedAt: "2026-10-27T10:00:00Z" },
    { threadId: second, propertyName: "Resolved Cottage", label: "Internet", priority: "normal", status: "resolved", updatedAt: "2026-10-27T09:00:00Z" },
  ] } }));
  await page.goto("/dashboard/manager");
  await expect(page.getByText("Open Cottage", { exact: true })).toBeVisible();
  await expect(page.getByText("Resolved Cottage", { exact: true })).toHaveCount(0);
  await page.getByLabel("Queue status").selectOption("resolved");
  await expect(page.getByText("Resolved Cottage", { exact: true })).toBeVisible();
  await expect(page.getByText("Open Cottage", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("PMS queue shows disconnected delivery, preserves unknown outcomes and permits cancellation on mobile", async ({ page }) => {
  await managerSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/manager", route => route.fulfill({ json: { rules: [], templates: [], triage: [] } }));
  let cancelled = false;
  let mutations = 0;
  await page.route("**/api/v1/manager/outbox", async route => {
    if (route.request().method() === "PATCH") {
      mutations++;
      expect(route.request().postDataJSON()).toEqual({ action: "cancel", id: first });
      cancelled = true;
      return route.fulfill({ json: { updated: true } });
    }
    return route.fulfill({ json: {
      deliveryAvailable: false, setupRequired: "Authorised PMS connection required", connections: [],
      messages: [
        { id: first, body: "Welcome to your cottage.", status: cancelled ? "cancelled" : "draft", contentHash: "a".repeat(64), scheduledAt: "2026-11-01T12:00:00Z", timeZone: "Europe/London", lastError: null },
        { id: second, body: "Earlier arrival message.", status: "unknown", contentHash: "b".repeat(64), scheduledAt: "2026-10-27T12:00:00Z", timeZone: "Europe/London", lastError: "provider_delivery_unconfirmed" },
      ],
    } });
  });
  await page.goto("/dashboard/manager");
  const queue = page.getByRole("region", { name: "PMS delivery queue" });
  await expect(queue.getByText("PMS delivery is not connected.", { exact: false })).toBeVisible();
  await expect(queue.getByRole("button", { name: "Approve this exact message" })).toBeDisabled();
  await expect(queue.getByRole("status").filter({ hasText: "Check the PMS" })).toContainText("Check the PMS before sending another message");
  await queue.getByRole("button", { name: "Cancel message" }).click();
  await expect(queue.getByRole("button", { name: "Cancel message" })).toHaveCount(0);
  expect(mutations).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
