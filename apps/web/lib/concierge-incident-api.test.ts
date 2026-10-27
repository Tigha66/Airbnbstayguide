import { beforeEach, expect, it, vi } from "vitest";
import { demoProperties } from "@stayguide/shared";
import { POST } from "../app/api/v1/guides/[slug]/chat/route";
import * as repo from "./repo";
import { generateJson } from "./ai";

vi.mock("./db", () => ({ dbConfigured: () => true }));
vi.mock("./ai", () => ({ aiConfigured: () => true, generateJson: vi.fn() }));
vi.mock("./repo", () => ({
  applyPortfolioRules: vi.fn(), consumeAiUsage: vi.fn(), consumeRateLimit: vi.fn(),
  getPublishedProperty: vi.fn(), saveMessages: vi.fn(), threadBelongsTo: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
it("saves the leak report as needing host help, runs triage and spends no AI quota", async () => {
  vi.mocked(repo.consumeRateLimit).mockResolvedValue(true);
  vi.mocked(repo.getPublishedProperty).mockResolvedValue({ property: demoProperties[0], ownerId: "owner" });
  vi.mocked(repo.applyPortfolioRules).mockResolvedValue(true);
  const response = await POST(new Request("https://example.test/api/v1/guides/test/chat", {
    method: "POST", body: JSON.stringify({ message: "There is a water leak in the bathroom", language: "en" }),
  }), { params: Promise.resolve({ slug: "test" }) });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ escalate: true, citations: [], mode: "keyword" });
  expect(body.answer).toContain("contact your host directly");
  expect(repo.saveMessages).toHaveBeenCalledWith(demoProperties[0].id, body.threadId, [
    expect.objectContaining({ role: "guest", content: "There is a water leak in the bathroom" }),
    expect.objectContaining({ role: "assistant", escalated: true, citations: [] }),
  ]);
  expect(repo.applyPortfolioRules).toHaveBeenCalledWith("owner", demoProperties[0].id, body.threadId, "There is a water leak in the bathroom");
  expect(repo.consumeAiUsage).not.toHaveBeenCalled();
  expect(generateJson).not.toHaveBeenCalled();
});
