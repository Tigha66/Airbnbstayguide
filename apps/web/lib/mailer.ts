export const supportEmail = "hello@getstayguide.com";

// The earlier Vercel Production setup used RESENDAPIKEY (no underscores).
// Keep both names supported without altering existing secret values.
// Prefer the canonical RESEND_API_KEY when both are present.
function resendApiKey() {
  return process.env.RESEND_API_KEY || process.env.RESENDAPIKEY;
}

export function mailerConfigured() {
  return Boolean(resendApiKey() && (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM));
}

/**
 * Read-only provider check. A configured key and sender address alone do not
 * prove Resend has authorized that sender domain to deliver account emails.
 * Never return API keys, provider responses, or any customer addresses.
 */
export async function senderDomainReadiness(): Promise<{ ok: boolean; detail: string }> {
  const key = resendApiKey();
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "";
  const domain = from.match(/@([a-z0-9.-]+\.[a-z]{2,})\b/i)?.[1]?.toLowerCase();
  if (!key || !domain) return { ok: false, detail: "Configure a valid account-email sender and Resend API key." };
  try {
    const response = await fetch("https://api.resend.com/domains?limit=100", {
      method: "GET",
      signal: AbortSignal.timeout(8_000),
      headers: { Authorization: `Bearer ${key}`, "User-Agent": "StayGuide-launch-checks/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return {
      ok: false,
      detail: `Could not verify the Resend sender domain (HTTP ${response.status}); check domain status and API-key permissions in Resend.`,
    };
    const body: unknown = await response.json();
    const result = body as {
      data?: { name?: string; status?: string; capabilities?: { sending?: string } }[];
      has_more?: boolean;
    };
    if (!Array.isArray(result.data)) return { ok: false, detail: "Resend did not return a valid domain list." };
    const match = result.data.find(item => item.name?.toLowerCase() === domain);
    if (match?.status === "verified" && match.capabilities?.sending !== "disabled")
      return { ok: true, detail: `Resend reports the sender domain ${domain} as verified. An actual verification email must still be delivered.` };
    if (result.has_more && !match) return {
      ok: false,
      detail: "Sender domain not found on the first Resend domains page; verify it in the Resend dashboard.",
    };
    return {
      ok: false,
      detail: `The sender domain ${domain} is not verified for outbound email in Resend.`,
    };
  } catch {
    return { ok: false, detail: "Resend domain verification is temporarily unavailable; verify manually before launch." };
  }
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const key = resendApiKey();
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!key || !from) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error("Email provider rejected delivery (" + res.status + ")");
  }
}
