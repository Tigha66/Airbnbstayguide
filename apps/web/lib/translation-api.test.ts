import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { demoProperties } from "@stayguide/shared";
import { GET } from "../app/api/v1/guides/[slug]/translation/route";
import * as repo from "./repo";
import { guideText, translateGuide } from "./translate";

vi.mock("./db", () => ({ dbConfigured: () => true }));
vi.mock("./ai", () => ({ aiConfigured: () => true, generateJson: vi.fn() }));
vi.mock("./repo", () => ({
  consumeRateLimit: vi.fn(), getGuideTranslation: vi.fn(),
  getPublishedProperty: vi.fn(), saveGuideTranslation: vi.fn(),
}));
vi.mock("./translate", async (original) => ({
  ...await original<typeof import("./translate")>(), translateGuide: vi.fn(),
}));

const source = guideText(demoProperties[0]);
const request = () => GET(new Request("https://example.test/api/v1/guides/casa-serena/translation?lang=de"),
  { params: Promise.resolve({ slug: "casa-serena" }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AI_TRANSLATION_MODEL", "");
  vi.mocked(repo.consumeRateLimit).mockResolvedValue(true);
  vi.mocked(repo.getGuideTranslation).mockResolvedValue(null);
  vi.mocked(repo.saveGuideTranslation).mockResolvedValue(undefined);
  vi.mocked(translateGuide).mockResolvedValue(source);
});
afterEach(() => vi.unstubAllEnvs());

it("distinguishes a guide already written in the selected language from a translation failure", async () => {
  const response = await GET(new Request("https://example.test/api/v1/guides/casa-serena/translation?lang=en"),
    { params: Promise.resolve({ slug: "casa-serena" }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ translated: false, originalLanguage: true });
  expect(translateGuide).not.toHaveBeenCalled();
});

it("rejects unchanged default-model output instead of reporting successful original-language content", async () => {
  const response = await request();
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "TRANSLATION_INCOMPLETE", retryable: true });
  expect(repo.saveGuideTranslation).not.toHaveBeenCalled();
});

it("rejects incomplete legacy caches even without a dedicated model", async () => {
  vi.mocked(repo.getGuideTranslation).mockResolvedValue({ ...source, description: "Willkommen in Ihrer Unterkunft." });
  const response = await request();
  expect(translateGuide).toHaveBeenCalled();
  expect(response.status).toBe(503);
  expect(repo.saveGuideTranslation).not.toHaveBeenCalled();
});

it("keeps dedicated-model progress private and never writes it as a completed language", async () => {
  vi.stubEnv("AI_TRANSLATION_MODEL", "qa-model");
  const response = await request();
  expect(response.status).toBe(503);
  expect(repo.saveGuideTranslation).toHaveBeenCalledTimes(1);
  expect(repo.saveGuideTranslation).toHaveBeenCalledWith("sample:casa-serena", "de:partial", expect.any(String), source);
});
