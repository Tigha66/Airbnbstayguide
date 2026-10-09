import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Full host → guest → host → guest flow against a real deployment (database, Google sign-in, AI).
 * Skipped unless both are set:
 *   E2E_LIVE_URL    the deployment, e.g. https://www.getstayguide.com or a preview with its own DB
 *   E2E_AUTH_STATE  Playwright storage state of a signed-in test host. Create it once with
 *                   `pnpm exec playwright codegen --save-storage=e2e-host.json $E2E_LIVE_URL/login`
 *                   (sign in with the test Google account, then close the window). Keep it secret.
 * The test host needs a free property slot; the property is deleted at the end.
 * Run: E2E_LIVE_URL=… E2E_AUTH_STATE=e2e-host.json pnpm exec playwright test tests/live-flow.spec.ts
 */
const base = process.env.E2E_LIVE_URL?.replace(/\/$/, "");
const authState = process.env.E2E_AUTH_STATE;
test.skip(!base || !authState, "Set E2E_LIVE_URL and E2E_AUTH_STATE to run the live flow");

const manual = `WI-FI: Network "E2E-Test", password "harbour2026"
CHECK-IN: From 15:00. The key box is on the left of the front door.
CHECKOUT: By 11:00. Leave the keys on the kitchen table.
PARKING: Free street parking on Rua das Flores.
HOUSE RULES: No smoking, no parties, quiet after 22:00.`;

async function host(request: APIRequestContext, method: "get" | "post" | "delete", path: string, data?: unknown) {
  return request[method](`${base}${path}`, { headers: { Origin: base! }, ...(data === undefined ? {} : { data }) });
}

test("host creates a guide, guest question escalates, host reply reaches the guest", async ({ browser }) => {
  test.setTimeout(180_000);
  const hostContext = await browser.newContext({ storageState: authState });
  const api = hostContext.request;
  const me = await (await host(api, "get", "/api/v1/me")).json();
  expect(me.user?.email, "the saved sign-in has expired; create E2E_AUTH_STATE again").toBeTruthy();

  const created = await host(api, "post", "/api/v1/properties", { name: `E2E Harbour Flat ${Date.now()}`, location: "Porto, Portugal", description: manual });
  expect(created.status(), await created.text()).toBe(201);
  const { property } = await created.json();
  try {
    const guest = await browser.newPage();
    await guest.goto(`${base}/g/${property.slug}`);
    await guest.getByRole("button", { name: "Concierge", exact: true }).click();
    const question = `Can you recommend a vet that treats parrots? (${Date.now()})`;
    await guest.getByLabel("Ask your concierge").fill(question);
    await guest.getByRole("button", { name: "Send question" }).click();
    await expect(guest.getByText(/Your question has been sent to your host|Your host has been notified/).last()).toBeVisible({ timeout: 60_000 });

    let threadId: string | undefined;
    await expect(async () => {
      const { threads } = await (await host(api, "get", "/api/v1/inbox")).json();
      const thread = threads.find((t: { escalated: boolean; messages: { content: string }[] }) => t.escalated && t.messages.some((m) => m.content === question));
      threadId = thread?.threadId;
      expect(threadId).toBeTruthy();
    }).toPass({ timeout: 30_000 });

    const reply = `Yes: Clínica Aves Porto, Rua Central 12 (${Date.now()})`;
    const sent = await host(api, "post", `/api/v1/inbox/${threadId}`, { content: reply });
    expect(sent.status()).toBe(201);
    await expect(guest.getByText(reply)).toBeVisible({ timeout: 30_000 });
    const { threads } = await (await host(api, "get", "/api/v1/inbox")).json();
    expect(threads.find((t: { threadId: string }) => t.threadId === threadId)?.escalated).toBe(false);
  } finally {
    await host(api, "delete", `/api/v1/properties/${property.id}`);
    await hostContext.close();
  }
});
