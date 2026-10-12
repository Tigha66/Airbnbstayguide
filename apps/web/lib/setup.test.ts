import { describe, expect, it } from "vitest";
import { demoProperties, templateById, type Property } from "@stayguide/shared";
import { setupStatus, setupSteps, setupPercent } from "./setup";

function withTemplate(id: string): Property {
  return { ...demoProperties[0], status: "draft", wifi: "", wifiPassword: "", extras: [], sections: templateById(id)!.sections };
}

describe("setup progress", () => {
  it("marks a complete demo guide as fully set up", () => {
    const status = setupStatus(demoProperties[0]);
    expect(status.details).toBe(true);
    expect(status.arrival).toBe(true);
    expect(status.checkout).toBe(true);
    expect(status.publish).toBe(true);
  });
  it("does not count templated sections with unresolved [prompts] as done", () => {
    const property = withTemplate("villa");
    const status = setupStatus(property);
    expect(status.arrival).toBe(false);
    expect(status.rules).toBe(false);
    expect(status.wifi).toBe(false);
    expect(status.extras).toBe(false);
    expect(status.publish).toBe(false);
  });
  it("counts a step done once real content replaces the prompts", () => {
    const property = withTemplate("villa");
    property.sections = property.sections.map((s) =>
      s.type === "arrival" ? { ...s, body: "Check-in is from 4 PM. The lockbox code is 1590." } : s,
    );
    expect(setupStatus(property).arrival).toBe(true);
  });
  it("counts a filled Wi-Fi field even without a Wi-Fi section", () => {
    const property = { ...withTemplate("cabin"), wifi: "Cabin_Guest" };
    expect(setupStatus(property).wifi).toBe(true);
  });
  it("returns a 0–100 percentage and labelled steps", () => {
    expect(setupPercent(demoProperties[0])).toBe(100);
    expect(setupPercent(withTemplate("villa"))).toBeLessThan(100);
    expect(setupSteps(demoProperties[0]).map((s) => s.key)).toEqual([
      "details", "arrival", "wifi", "rules", "checkout", "extras", "publish",
    ]);
  });
});
