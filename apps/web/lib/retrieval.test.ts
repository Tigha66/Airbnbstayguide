import { describe, expect, it } from "vitest";
import { parseManual } from "./guide-parser";
import { retrieve, tokens } from "./retrieval";
import { keywordAnswer } from "./concierge";
import { demoProperties } from "@stayguide/shared";

const manual = `Welcome to Sea Breeze Loft! Check-in is from 3:00 PM, checkout by 11:00 AM.
ARRIVAL: The building door code is 4821. Keys are in the lockbox, code 1590.
WI-FI: Network "SeaBreeze_Guest", password "Playa2026".
HOUSE RULES: No smoking, no parties.
PARKING: Use Saba Parking on Carrer de Pujades 50.
CHECKOUT: Load the dishwasher and leave keys in the lockbox.`;
const sections = parseManual(manual);

describe("keyword search (used when AI is unavailable)", () => {
  it("does not over-stem short words", () => {
    expect(tokens("bring")).toEqual(["bring"]);
    expect(tokens("parking")).toEqual(["park"]);
    expect(tokens("check-out check out check-in")).toEqual(["checkout", "checkout", "checkin"]);
  });
  it("escalates questions the guide doesn't cover instead of answering with unrelated text", () => {
    expect(retrieve(sections, "Can I bring my pet tiger to the apartment?", 1)).toEqual([]);
    const property = { ...demoProperties[0], sections };
    const answer = keywordAnswer(property, "Can I bring my pet tiger to the apartment?", "en");
    expect(answer.escalate).toBe(true);
    expect(answer.answer).toMatch(/passed your question to your host/);
  });
  it("still finds the right section for real questions", () => {
    expect(retrieve(sections, "What is the wifi password?", 1)[0]?.type).toBe("wifi");
    expect(retrieve(sections, "Where can I park?", 1)[0]?.type).toBe("parking");
    expect(retrieve(sections, "What do I do at check-out?", 1)[0]?.type).toBe("checkout");
  });
});
