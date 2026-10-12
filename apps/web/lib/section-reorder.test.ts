import { describe, it, expect } from "vitest";
import type { Section } from "@stayguide/shared";

describe("Section reordering logic", () => {
  const createTestSections = (): Section[] => [
    {
      id: "arrival",
      type: "arrival",
      title: "A lovely arrival",
      body: "Welcome content",
      icon: "key",
    },
    {
      id: "wifi",
      type: "wifi",
      title: "Get connected",
      body: "Wi-Fi details",
      icon: "wifi",
    },
    {
      id: "rules",
      type: "rules",
      title: "House rules",
      body: "Rules content",
      icon: "heart",
    },
    {
      id: "checkout",
      type: "checkout",
      title: "Checkout",
      body: "Checkout details",
      icon: "sun",
    },
  ];

  it("should reorder sections by swapping positions", () => {
    const sections = createTestSections();
    const items = [...sections];

    const from = items.findIndex((x) => x.id === "arrival");
    const to = items.findIndex((x) => x.id === "wifi");

    if (from >= 0 && to >= 0) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items[0].id).toBe("wifi");
    expect(items[1].id).toBe("arrival");
    expect(items[2].id).toBe("rules");
    expect(items[3].id).toBe("checkout");
  });

  it("should preserve section data when reordering", () => {
    const sections = createTestSections();
    const items = [...sections];
    const originalWifiContent = items[1].body;

    const from = items.findIndex((x) => x.id === "arrival");
    const to = items.findIndex((x) => x.id === "wifi");

    if (from >= 0 && to >= 0) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items[0].body).toBe(originalWifiContent);
  });

  it("should handle dragging first section to the end", () => {
    const sections = createTestSections();
    const items = [...sections];

    const from = 0;
    const to = items.length - 1;

    if (from >= 0 && to >= 0) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items[0].id).toBe("checkout");
    expect(items[items.length - 1].id).toBe("arrival");
  });

  it("should handle dragging last section to the beginning", () => {
    const sections = createTestSections();
    const items = [...sections];

    const from = items.length - 1;
    const to = 0;

    if (from >= 0 && to >= 0) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items[0].id).toBe("checkout");
    expect(items[items.length - 1].id).toBe("arrival");
  });

  it("should not modify sections when from and to indices are invalid", () => {
    const sections = createTestSections();
    const items = [...sections];
    const originalIds = items.map((s) => s.id);

    const from = -1;
    const to = 2;

    if (from >= 0 && to >= 0) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items.map((s) => s.id)).toEqual(originalIds);
  });

  it("should handle adjacent section swaps", () => {
    const sections = createTestSections();
    const items = [...sections];

    const from = items.findIndex((x) => x.id === "arrival");
    const to = from + 1;

    if (from >= 0 && to >= 0 && to < items.length) {
      [items[from], items[to]] = [items[to], items[from]];
    }

    expect(items[0].id).toBe("wifi");
    expect(items[1].id).toBe("arrival");
  });

  it("should correctly identify section indices by id", () => {
    const sections = createTestSections();

    const arrivalIdx = sections.findIndex((x) => x.id === "arrival");
    const checkoutIdx = sections.findIndex((x) => x.id === "checkout");

    expect(arrivalIdx).toBe(0);
    expect(checkoutIdx).toBe(3);
  });

  it("should return -1 when looking up nonexistent section id", () => {
    const sections = createTestSections();

    const idx = sections.findIndex((x) => x.id === "nonexistent");

    expect(idx).toBe(-1);
  });
});
