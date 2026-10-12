import { describe, it, expect } from "vitest";
import type { Recommendation } from "@stayguide/shared";

describe("Recommendation helpers", () => {
  it("should create a valid recommendation", () => {
    const rec: Recommendation = {
      id: "rec-1",
      title: "Casa do Bacalhoada",
      type: "restaurant",
      address: "Rua da Prata, Lisbon",
      lat: 38.7097,
      lng: -9.1428,
      description: "Traditional Portuguese seafood",
    };

    expect(rec.id).toBe("rec-1");
    expect(rec.type).toBe("restaurant");
    expect(rec.lat).toBeGreaterThan(0);
  });

  it("should support different recommendation types", () => {
    const types: Array<Recommendation["type"]> = [
      "restaurant",
      "cafe",
      "attraction",
      "activity",
    ];

    types.forEach((type) => {
      const rec: Recommendation = {
        id: `rec-${type}`,
        title: `A ${type}`,
        type,
        address: "Test address",
        lat: 0,
        lng: 0,
        description: "",
      };
      expect(rec.type).toBe(type);
    });
  });

  it("should filter recommendations by type", () => {
    const recs: Recommendation[] = [
      {
        id: "r1",
        title: "Restaurant A",
        type: "restaurant",
        address: "addr1",
        lat: 0,
        lng: 0,
        description: "",
      },
      {
        id: "c1",
        title: "Cafe B",
        type: "cafe",
        address: "addr2",
        lat: 0,
        lng: 0,
        description: "",
      },
      {
        id: "r2",
        title: "Restaurant C",
        type: "restaurant",
        address: "addr3",
        lat: 0,
        lng: 0,
        description: "",
      },
    ];

    const restaurants = recs.filter((r) => r.type === "restaurant");
    expect(restaurants).toHaveLength(2);
    expect(restaurants[0].id).toBe("r1");
  });
});
