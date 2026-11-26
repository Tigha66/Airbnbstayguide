import { describe, expect, it } from "vitest";
import { validateWalkthroughEnquiry } from "./walkthrough-enquiry";

describe("validateWalkthroughEnquiry", () => {
  it("normalizes valid contact details and accepts only HTTPS property URLs", () => {
    expect(validateWalkthroughEnquiry({name:"  Host Name ",email:"HOST@example.com",propertyName:"Sea View",propertyUrl:"https://example.com/stay",company:""})).toEqual({
      name:"Host Name",email:"host@example.com",propertyName:"Sea View",propertyUrl:"https://example.com/stay",company:"",
    });
  });
  it.each(["http://example.com","javascript:alert(1)","https://localhost"])("rejects unsafe or incomplete URL %s", propertyUrl => {
    expect(validateWalkthroughEnquiry({name:"Host",email:"host@example.com",propertyName:"Flat",propertyUrl,company:""})).toBeNull();
  });
  it("rejects invalid emails and overlong input", () => {
    expect(validateWalkthroughEnquiry({name:"Host",email:"bad",propertyName:"Flat",propertyUrl:"https://example.com",company:""})).toBeNull();
    expect(validateWalkthroughEnquiry({name:"x".repeat(101),email:"host@example.com",propertyName:"Flat",propertyUrl:"https://example.com",company:""})).toBeNull();
  });
});
