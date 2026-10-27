import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoProperties } from "@stayguide/shared";
import { aiAnswer, hostAttentionAnswer, keywordAnswer } from "./concierge";
import { generateJson } from "./ai";

vi.mock("./ai", () => ({ generateJson: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
describe("water-leak reports", () => {
  it.each([
    "There is a water leak in the bathroom",
    "TEST: The WATER LEAK is still happening",
    "The ceiling is leaking",
    "The bathroom is flooded",
    "Il y a une fuite d’eau dans la salle de bain",
    "Hay una fuga de agua en el baño",
  ])("hands off %s without unrelated appliance citations", async (message) => {
    const property = demoProperties[0];
    const fallback = keywordAnswer(property, message, "en");
    expect(fallback).toMatchObject({ escalate: true, citations: [] });
    expect(fallback.answer).toContain("contact your host directly");
    expect(fallback.answer).not.toMatch(/coffee|washing machine|capsules/i);
    expect(await aiAnswer(property, message, "en")).toEqual(fallback);
    expect(generateJson).not.toHaveBeenCalled();
  });
  it("preserves ordinary appliance answers and localizes the handoff", () => {
    expect(hostAttentionAnswer("How does the coffee machine work?", "en")).toBeNull();
    expect(keywordAnswer(demoProperties[0], "How does the coffee machine work?", "en").citations.length).toBeGreaterThan(0);
    expect(hostAttentionAnswer("fuite d'eau", "fr")?.answer).toContain("Contactez-le directement");
  });
});
