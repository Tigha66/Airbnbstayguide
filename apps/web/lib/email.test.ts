import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, escalationEmail, extraDecisionEmail, extraRequestEmail, looksLikeEmail, sendEmail } from "./email";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sending email", () => {
  it("is a logged no-op when Resend isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(emailConfigured()).toBe(false);
    expect(await sendEmail({ to: "host@example.com", subject: "Hi", text: "x", html: "x" })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("posts to Resend with the sender and reply-to, and never throws", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "StayGuide <hi@getstayguide.com>");
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    expect(await sendEmail({ to: "host@example.com", subject: "Hi", text: "x", html: "x", replyTo: "guest@example.com" })).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ from: "StayGuide <hi@getstayguide.com>", to: ["host@example.com"], reply_to: "guest@example.com" });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await sendEmail({ to: "host@example.com", subject: "Hi", text: "x", html: "x" })).toBe(false);
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 422 }));
    expect(await sendEmail({ to: "host@example.com", subject: "Hi", text: "x", html: "x" })).toBe(false);
  });
  it("recognises email addresses (guests may leave a phone number instead)", () => {
    expect(looksLikeEmail("guest@example.com")).toBe(true);
    expect(looksLikeEmail("+44 7700 900123")).toBe(false);
  });
});

describe("email content", () => {
  it("escapes guest text and links to the inbox", () => {
    const e = escalationEmail({ to: "h@example.com", hostName: "Ana Host", propertyName: "Casa <b>Serena</b>", question: "<script>alert(1)</script> Can we bring a dog?", language: "fr" });
    expect(e.subject).toBe("A guest at Casa <b>Serena</b> needs your help");
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("/dashboard/inbox");
    expect(e.text).toContain("Hi Ana,");
  });
  it("tells the host about an extra request and lets them reply to the guest", () => {
    const e = extraRequestEmail({ to: "h@example.com", propertyName: "Casa Serena", extraName: "Late checkout", guestName: "Sam", guestContact: "sam@example.com", note: "Flight at 6pm", paidOnline: false });
    expect(e.replyTo).toBe("sam@example.com");
    expect(e.text).toContain("Flight at 6pm");
    expect(e.html).toContain("/dashboard/extras");
  });
  it("tells the guest the decision", () => {
    expect(extraDecisionEmail({ to: "g@example.com", guestName: "Sam", propertyName: "Casa", extraName: "Late checkout", approved: true, guideUrl: "https://x/g/casa" }).subject).toContain("is confirmed");
    expect(extraDecisionEmail({ to: "g@example.com", guestName: "Sam", propertyName: "Casa", extraName: "Late checkout", approved: false, guideUrl: "https://x/g/casa" }).text).toContain("can't offer");
  });
});
