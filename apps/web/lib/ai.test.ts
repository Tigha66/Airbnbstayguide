import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfigured } from "./ai";

afterEach(() => vi.unstubAllEnvs());

describe("AI provider configuration", () => {
  it("rejects the placeholder OpenAI key observed in production diagnostics", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_MODEL", "gpt-4o-mini");
    vi.stubEnv("OPENAI_API_KEY", "your_api_key_here");
    expect(aiConfigured()).toBe(false);
  });

  it("rejects placeholder keys for other providers", () => {
    vi.stubEnv("AI_PROVIDER", "huggingface");
    vi.stubEnv("HF_TOKEN", "replace-me");
    expect(aiConfigured()).toBe(false);

    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_BASE_URL", "https://example.com/v1");
    vi.stubEnv("AI_MODEL", "example-model");
    vi.stubEnv("AI_API_KEY", "your-token-here");
    expect(aiConfigured()).toBe(false);
  });

  it("accepts non-placeholder credentials for explicitly configured providers", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_MODEL", "gpt-4o-mini");
    vi.stubEnv("OPENAI_API_KEY", "sk-fixture-not-a-real-key");
    expect(aiConfigured()).toBe(true);
  });

  it("does not claim AI availability without a credential", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("AI_MODEL", "claude-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(aiConfigured()).toBe(false);
  });
});
