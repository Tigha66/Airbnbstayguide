import { describe, it, expect } from "vitest";
import {
  priceFor,
  applicationFee,
  conciergeSystemPrompt,
  demoAnswer,
  demoProperties,
  chatSchema,
  toPublicProperty,
  toGroundedProperty,
  ALL_PROPERTY_FIELDS,
  type Property,
} from "./index";
describe("billing rules", () => {
  it("charges ten months annually", () => {
    expect(priceFor("pro", 3, true)).toBe(570);
    expect(priceFor("starter", 2)).toBe(18);
  });
  it("rejects invalid quantities", () => {
    for (const quantity of [0, -1, 1.5, 101, NaN])
      expect(() => priceFor("pro", quantity)).toThrow();
  });
  it("computes a five percent fee in cents", () => {
    expect(applicationFee(3500)).toBe(175);
    expect(applicationFee(999)).toBe(50);
    expect(() => applicationFee(-1)).toThrow();
  });
});
describe("guest safeguards", () => {
  it("bounds public input", () => {
    expect(chatSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
  it("grounds answers and escalates unknown questions", () => {
    expect(
      demoAnswer(demoProperties[0], "When is checkout?").citations,
    ).toEqual(["Until next time"]);
    expect(
      demoAnswer(demoProperties[0], "Write me a business plan").escalate,
    ).toBe(true);
  });
  it("treats guide text as untrusted and requires citations", () => {
    const prompt = conciergeSystemPrompt("sample", "fr");
    expect(prompt).toContain("untrusted");
    expect(prompt).toContain("Cite");
    expect(prompt).toContain("escalate=true");
    expect(prompt).toContain("reply in fr");
  });
});
describe("public guide projection (deny-by-default)", () => {
  const locked: Property = { ...demoProperties[0], accessCode: "4821" };
  const open: Property = { ...demoProperties[0], accessCode: undefined };
  it("withholds wifi password and host phone until unlocked", () => {
    const pub = toPublicProperty(locked);
    expect(pub.locked).toBe(true);
    expect(pub.wifiPassword).toBe("");
    expect(pub.hostPhone).toBe("");
  });
  it("never includes the access code itself, locked or not", () => {
    expect(toPublicProperty(locked)).not.toHaveProperty("accessCode");
    expect(toPublicProperty(locked, true)).not.toHaveProperty("accessCode");
  });
  it("reveals the gated fields once unlocked", () => {
    const pub = toPublicProperty(locked, true);
    expect(pub.locked).toBe(false);
    expect(pub.wifiPassword).toBe(locked.wifiPassword);
    expect(pub.hostPhone).toBe(locked.hostPhone);
  });
  it("stays fully open when the host never set a code", () => {
    const pub = toPublicProperty(open);
    expect(pub.locked).toBe(false);
    expect(pub.wifiPassword).toBe(open.wifiPassword);
  });
  it("redacts the same fields from what the AI concierge is grounded on", () => {
    expect(toGroundedProperty(locked, false).wifiPassword).toBe("");
    expect(toGroundedProperty(locked, false).hostPhone).toBe("");
    expect(toGroundedProperty(locked, true).wifiPassword).toBe(locked.wifiPassword);
    expect(toGroundedProperty(open, false).wifiPassword).toBe(open.wifiPassword);
  });
  it("fails if a new Property field is added without classifying it as public or gated", () => {
    // Every key actually on a real Property value must appear in ALL_PROPERTY_FIELDS.
    // If this fails, you added a field to Property and forgot to decide whether
    // toPublicProperty should expose it — the safe default is: don't, until reviewed.
    const sample: Property = { ...demoProperties[0], accessCode: "x" };
    for (const key of Object.keys(sample))
      expect(ALL_PROPERTY_FIELDS, `unclassified Property field: "${key}"`).toContain(key);
  });
});
