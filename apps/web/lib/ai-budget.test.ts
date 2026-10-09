import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = {
  consumeRateLimit: vi.fn(async () => true),
  inCooldown: vi.fn(async () => false),
  refundAiUsage: vi.fn(async () => {}),
  reserveAiUsage: vi.fn(async () => true),
  startCooldown: vi.fn(async () => {}),
};
vi.mock("./repo", () => repo);
vi.mock("./ai", () => ({ aiConfigured: () => true, aiProviderInfo: () => ({ provider: "test", model: "m" }) }));

const { buildSectionsWithBudget, isProviderOutage, providerStatus, runWithAllowance } = await import("./ai-budget");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("provider errors", () => {
  it("reads the status from AI SDK errors, including retries", () => {
    expect(providerStatus({ statusCode: 402 })).toBe(402);
    expect(providerStatus({ lastError: { statusCode: 429 } })).toBe(429);
    expect(providerStatus({ errors: [{ statusCode: 500 }, { statusCode: 503 }] })).toBe(503);
    expect(providerStatus(new Error("timeout"))).toBeUndefined();
  });
  it("treats out-of-credit, rate limits and outages as provider outages", () => {
    expect(isProviderOutage({ statusCode: 402 })).toBe(true);
    expect(isProviderOutage({ statusCode: 429 })).toBe(true);
    expect(isProviderOutage({ statusCode: 502 })).toBe(true);
    expect(isProviderOutage({ statusCode: 400 })).toBe(false);
    expect(isProviderOutage(new Error("bad JSON"))).toBe(false);
  });
});

describe("runWithAllowance", () => {
  it("charges only successful calls", async () => {
    expect(await runWithAllowance("u1", 1, async () => "answer")).toEqual({ ok: true, value: "answer" });
    expect(repo.refundAiUsage).not.toHaveBeenCalled();
  });
  it("gives the allowance back and pauses AI after a provider outage", async () => {
    const run = await runWithAllowance("u1", 3, async () => {
      throw { statusCode: 402 };
    });
    expect(run).toEqual({ ok: false, reason: "error" });
    expect(repo.refundAiUsage).toHaveBeenCalledWith("u1", 3);
    expect(repo.startCooldown).toHaveBeenCalledWith("ai-provider", 300);
  });
  it("refunds but doesn't pause after an ordinary failure", async () => {
    await runWithAllowance("u1", 1, async () => {
      throw new Error("bad JSON");
    });
    expect(repo.refundAiUsage).toHaveBeenCalled();
    expect(repo.startCooldown).not.toHaveBeenCalled();
  });
  it("skips the AI while paused or when the allowance is used up", async () => {
    const call = vi.fn(async () => "x");
    repo.inCooldown.mockResolvedValueOnce(true);
    expect(await runWithAllowance("u1", 1, call)).toEqual({ ok: false, reason: "cooldown" });
    repo.reserveAiUsage.mockResolvedValueOnce(false);
    expect(await runWithAllowance("u1", 1, call)).toEqual({ ok: false, reason: "allowance" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("guide building budget", () => {
  it("is limited to 10 AI builds per host per hour", async () => {
    await buildSectionsWithBudget("u1", async () => []);
    expect(repo.consumeRateLimit).toHaveBeenCalledWith("ai-build:u1", 10, 3600);
    repo.consumeRateLimit.mockResolvedValueOnce(false);
    const build = vi.fn(async () => []);
    expect(await buildSectionsWithBudget("u1", build)).toBeUndefined();
    expect(build).not.toHaveBeenCalled();
  });
});
