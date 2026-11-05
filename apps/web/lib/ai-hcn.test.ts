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
  it.each([522, 525, 526])("recovers once from Cloudflare HTTP %s without restarting the overall budget", async status => {
    configureHcn();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("gateway unavailable", { status }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"answer":"Guide says 11 AM"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateJson("Use guide facts", "When is checkout?", 200, 5000, "fixture-model");
    expect(result).toEqual({ answer: "Guide says 11 AM" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = fetchMock.mock.calls[0][1] as RequestInit;
    const second = fetchMock.mock.calls[1][1] as RequestInit;
    expect(first.signal?.aborted).toBe(false);
    expect(second.signal?.aborted).toBe(false);
    expect(JSON.parse(String(first.body)).model).toBe("fixture-model");
  });

  it("reserves time for a retry when the first transport stalls", async () => {
    configureHcn();
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url, init: RequestInit) => new Promise((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"answer":"Recovered"}' } }] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateJson("Use guide facts", "Question", 200, 1600, "fixture-model");
    expect(result).toEqual({ answer: "Recovered" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(true);
    expect((fetchMock.mock.calls[1][1] as RequestInit).signal!.aborted).toBe(false);
  });

  it("stops after the shared deadline when both transports stall", async () => {
    configureHcn();
    const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson("Use guide facts", "Question", 200, 1600, "fixture-model"))
      .rejects.toThrow("HCN gateway request unavailable within its deadline");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1] as RequestInit).signal!.aborted).toBe(true);
  });

  it("does not retry nontransient authentication failures or expose provider responses", async () => {
    configureHcn();
    const fetchMock = vi.fn().mockResolvedValue(new Response("private provider details", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson("Use guide facts", "Question", 200, 1000, "fixture-model"))
      .rejects.toThrow("HCN translation gateway HTTP 401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses DeepSeek's non-thinking switch for its advertised HCN model route", async () => {
    configureHcn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"answer":"Ready"}' } }],
    })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateJson("Use guide facts", "Question", 200, 1000, "DeepSeek-V4-Flash"))
      .toEqual({ answer: "Ready" });
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body).not.toHaveProperty("chat_template_kwargs");
  });
});
