import { afterEach, describe, expect, it } from "vitest";
import { adminEmails, isAdminEmail } from "./admin";

describe("owner access", () => {
  const original = process.env.ADMIN_EMAILS;
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });
  it("only lets the founder in by default", () => {
    delete process.env.ADMIN_EMAILS;
    expect(adminEmails()).toEqual(["abdelhaktirha@gmail.com"]);
    expect(isAdminEmail("abdelhaktirha@gmail.com")).toBe(true);
    expect(isAdminEmail(" AbdelhakTirha@Gmail.com ")).toBe(true);
    expect(isAdminEmail("host@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
  it("can be changed with ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "a@x.com, B@y.com";
    expect(isAdminEmail("b@y.com")).toBe(true);
    expect(isAdminEmail("abdelhaktirha@gmail.com")).toBe(false);
  });
});
