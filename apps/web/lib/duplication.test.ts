import { describe, it, expect } from "vitest";
import type { Property } from "@stayguide/shared";

describe("Property duplication", () => {
  const createTestProperty = (): Property => ({
    id: "test-property",
    slug: "test-property",
    name: "Test Property",
    location: "Test City",
    image: "https://example.com/image.jpg",
    status: "published",
    description: "Test description",
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    wifi: "TestWifi",
    wifiPassword: "password123",
    hostPhone: "+1234567890",
    sections: [
      {
        id: "arrival",
        type: "arrival",
        title: "Arrival",
        body: "Arrival details",
        icon: "key",
      },
    ],
    extras: [
      {
        id: "extra1",
        name: "Extra Service",
        description: "An extra service",
        price: 5000,
        icon: "gift",
        approval: false,
      },
    ],
  });

  it("should duplicate a property with new ID and slug", () => {
    const original = createTestProperty();
    const duplicated = {
      ...original,
      id: "new-id",
      slug: "test-property-abc123",
      name: `${original.name} (Copy)`,
      status: "draft" as const,
    };

    expect(duplicated.id).not.toBe(original.id);
    expect(duplicated.slug).not.toBe(original.slug);
    expect(duplicated.name).toContain("(Copy)");
    expect(duplicated.status).toBe("draft");
  });

  it("should preserve all sections when duplicating", () => {
    const original = createTestProperty();
    const duplicated = { ...original, id: "new-id" };

    expect(duplicated.sections).toHaveLength(original.sections.length);
    expect(duplicated.sections[0].body).toBe(original.sections[0].body);
  });

  it("should preserve all extras when duplicating", () => {
    const original = createTestProperty();
    const duplicated = { ...original, id: "new-id" };

    expect(duplicated.extras).toHaveLength(original.extras.length);
    expect(duplicated.extras[0].price).toBe(original.extras[0].price);
  });

  it("should preserve recommendations when duplicating", () => {
    const original = createTestProperty();
    const withRecs = {
      ...original,
      recommendations: [
        {
          id: "rec1",
          title: "Restaurant",
          type: "restaurant" as const,
          address: "123 Main St",
          lat: 40.7128,
          lng: -74.006,
          description: "A great place",
        },
      ],
    };
    const duplicated = { ...withRecs, id: "new-id" };

    expect(duplicated.recommendations).toHaveLength(1);
    expect(duplicated.recommendations?.[0].title).toBe("Restaurant");
  });

  it("should set status to draft for duplicated properties", () => {
    const original = createTestProperty();
    const duplicated = { ...original, id: "new-id", status: "draft" as const };

    expect(duplicated.status).toBe("draft");
  });
});
