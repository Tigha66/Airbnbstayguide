import { describe, expect, it } from "vitest";
import { validateWalkthroughEnquiry } from "./walkthrough-enquiry";

describe("walkthrough enquiry validation", () => {
  const valid = { name: "A Host", email: "HOST@example.com", propertyName: "Seaview Flat", propertyUrl: "https://example.com/stays/1", company: "" };
  it("normalizes valid contact details and accepts HTTPS listing URLs", () => {
    expect(validateWalkthroughEnquiry(valid)).toMatchObject({ email: "host@example.com", propertyName: "Seaview Flat" });
  });
  it("rejects malformed fields and non-HTTPS URLs", () => {
    expect(validateWalkthroughEnquiry({ ...valid, email: "bad" })).toBeNull();
    expect(validateWalkthroughEnquiry({ ...valid, propertyUrl: "http://example.com" })).toBeNull();
    expect(validateWalkthroughEnquiry({ ...valid, name: "x" })).toBeNull();
  });
});
