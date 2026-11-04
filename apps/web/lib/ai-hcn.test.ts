import { afterEach, describe, expect, it, vi } from "vitest";
import { generateJson } from "./ai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function configureHcn() {
  vi.stubEnv("AI_PROVIDER", "openai-compatible");
  vi.stubEnv("AI_BASE_URL", "https://api.hcnsec.cn/v1");
  vi.stubEnv("AI_API_KEY", "fixture-only-not-a-secret");
  vi.stubEnv("AI_MODEL", "auto");
}

describe("HCN gateway transient failures", () => {
  it("retries Cloudflare HTTP 522 once using the same deadline", async () => {
    configureHcn();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 522 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"answer":"Guide says 11 AM"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateJson("Use guide facts", "When is checkout?", 200, 5000, "fixture-model");
    expect(result).toEqual({ answer: "Guide says 11 AM" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = fetchMock.mock.calls[0][1] as RequestInit;
    const second = fetchMock.mock.calls[1][1] as RequestInit;
    expect(first.signal).toBe(second.signal);
    expect(JSON.parse(String(first.body)).model).toBe("fixture-model");
  });

  it("does not retry nontransient authentication failures or expose provider responses", async () => {
    configureHcn();
    const fetchMock = vi.fn().mockResolvedValue(new Response("private provider details", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson("Use guide facts", "Question", 200, 1000, "fixture-model"))
      .rejects.toThrow("HCN translation gateway HTTP 401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
