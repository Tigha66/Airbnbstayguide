import { afterEach, describe, expect, it, vi } from "vitest";
import { demoProperties } from "@stayguide/shared";
import { readGuestSetting, readGuestTranslation, translationSource, writeGuestSetting, writeGuestTranslation } from "./guest-storage";

afterEach(() => vi.unstubAllGlobals());
describe("guest persistence recovery", () => {
  it("ignores a cached translation after the host changes a door code", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k), setItem: (k: string, v: string) => data.set(k, v) });
    const p = { ...demoProperties[0], sections: [{ id: "arrival", title: "Arrival", body: "Code 4821", type: "arrival", icon: "key" }] };
    const text = { description: "Bienvenue", sections: [{ id: "arrival", title: "Arrivée", body: "Code 4821" }], extras: [] };
    writeGuestTranslation("fr", translationSource(p), text);
    expect(readGuestTranslation("fr", translationSource(p))).toEqual(text);
    const edited = { ...p, sections: [{ ...p.sections[0], body: "Code 9876" }] };
    expect(readGuestTranslation("fr", translationSource(edited))).toBeNull();
  });
  it("rejects legacy, corrupted and structurally invalid translation caches", () => {
    let value = "{";
    vi.stubGlobal("localStorage", { getItem: () => value });
    expect(readGuestTranslation("key", "version")).toBeNull();
    value = JSON.stringify({ description: "legacy without source version" });
    expect(readGuestTranslation("key", "version")).toBeNull();
    value = JSON.stringify({ source: "version", text: { sections: "broken" } });
    expect(readGuestTranslation("key", "version")).toBeNull();
  });
  it("continues without storage in private or full browsers", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } });
    expect(readGuestSetting("language")).toBeNull();
    expect(() => writeGuestSetting("thread", "thread-id")).not.toThrow();
    expect(readGuestTranslation("key", "version")).toBeNull();
  });
});
