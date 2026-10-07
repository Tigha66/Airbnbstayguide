import { describe, expect, it } from "vitest";
import { mapsUrl, propertySchema, demoProperties } from "@stayguide/shared";
import { propertyDataSchema } from "./repo";

describe("property address", () => {
  it("opens Maps at the exact street address when one is set", () => {
    const url = mapsUrl({ address: "123 Ridge Road, Gatlinburg, TN 37738", location: "Gatlinburg, Tennessee" });
    expect(url).toBe("https://www.google.com/maps/search/?api=1&query=123%20Ridge%20Road%2C%20Gatlinburg%2C%20TN%2037738");
  });
  it("falls back to the town for guides without an address", () => {
    expect(mapsUrl({ location: "Lisbon, Portugal" })).toContain("query=Lisbon%2C%20Portugal");
    expect(mapsUrl({ address: "   ", location: "Lisbon, Portugal" })).toContain("query=Lisbon%2C%20Portugal");
  });
  it("accepts an optional address when creating and saving a property", () => {
    expect(propertySchema.parse({ name: "Smoky Ridge Cabin", location: "Gatlinburg, TN" }).address).toBe("");
    expect(propertySchema.parse({ name: "Smoky Ridge Cabin", location: "Gatlinburg, TN", address: " 123 Ridge Rd " }).address).toBe("123 Ridge Rd");
    const p = demoProperties[0];
    expect(propertyDataSchema.safeParse({ ...p, address: "1 Main St" }).success).toBe(true);
    expect(propertyDataSchema.safeParse({ ...p }).success).toBe(true);
    expect(propertyDataSchema.safeParse({ ...p, address: "x".repeat(301) }).success).toBe(false);
  });
});
