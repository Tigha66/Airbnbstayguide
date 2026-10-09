import { describe, expect, it } from "vitest";
import { demoProperties } from "@stayguide/shared";
import { parseManual, extractWifi, extractTime } from "./guide-parser";
import { retrieve } from "./retrieval";
import { extractJson } from "./ai";
import { keywordAnswer } from "./concierge";
const manual = `Welcome to Sea Breeze Loft! Check-in is from 3:00 PM, checkout by 11:00 AM.
ARRIVAL: The building door code is 4821. Keys are in the lockbox, code 1590.
WI-FI: Network "SeaBreeze_Guest", password "Playa2026".
HOUSE RULES: No smoking, no parties.
PARKING: Use Saba Parking on Carrer de Pujades 50.
TRASH: Grey = general, yellow = plastic.
CHECKOUT: Load the dishwasher and leave keys in the lockbox.
EMERGENCY: Call 112.
LOCAL TIPS: Breakfast at Café Mar.`;
describe("manual parser", () => {
  it("splits labelled manuals into typed sections", () => {
    const s = parseManual(manual);
    expect(s.map((x) => x.type)).toEqual(["welcome", "arrival", "wifi", "rules", "parking", "trash", "checkout", "emergency", "local"]);
    expect(s.find((x) => x.type === "arrival")?.body).toContain("4821");
  });
  it("supports markdown headings", () => {
    const s = parseManual("# Wi-Fi\nNetwork Home\n\n# Check out\nLeave by 10");
    expect(s.map((x) => x.type)).toEqual(["wifi", "checkout"]);
  });
  it("extracts wifi and times", () => {
    expect(extractWifi(manual)).toEqual({ network: "SeaBreeze_Guest", password: "Playa2026" });
    expect(extractTime(manual, "in")).toBe("3:00 PM");
    expect(extractTime(manual, "out")).toBe("11:00 AM");
  });
});
describe("retrieval", () => {
  const sections = parseManual(manual);
  it("finds the right section", () => {
    expect(retrieve(sections, "where can I park the car?")[0].type).toBe("parking");
    expect(retrieve(sections, "what is the internet password")[0].type).toBe("wifi");
    expect(retrieve(sections, "what's the lockbox code")[0].type).toBe("arrival");
  });
  it("returns nothing for unrelated questions", () => {
    expect(retrieve(sections, "write me a poem about quantum physics")).toEqual([]);
  });
  it("keyword concierge cites or escalates", () => {
    const p = demoProperties[0];
    expect(keywordAnswer(p, "Where do I park?", "en").citations.length).toBe(1);
    expect(keywordAnswer(p, "Explain bitcoin", "en").escalate).toBe(true);
  });
});
describe("extractJson", () => {
  it("handles fenced and prose-wrapped JSON", () => {
    expect(extractJson('Sure!\n```json\n{"a":"}","b":[1]}\n```')).toEqual({ a: "}", b: [1] });
    expect(extractJson('[{"x":1}] trailing')).toEqual([{ x: 1 }]);
  });
});

describe("parseManual headings match whole words", () => {
  it("keeps cabin, outdoors, fireplace and beach headings as their own sections", () => {
    const sections = parseManual(
      "THE CABIN: Two bedrooms.\nOUTDOORS: Deck and grill.\nFIREPLACE: Gas only.\nBEACH: Chairs from March.\nBINS: Blue for recycling.",
    );
    expect(sections.map((s) => s.type)).toEqual(["custom", "custom", "custom", "custom", "trash"]);
    expect(sections.map((s) => s.title)).toEqual(["The Cabin", "Outdoors", "Fireplace", "Beach", "Trash & recycling"]);
  });
});
