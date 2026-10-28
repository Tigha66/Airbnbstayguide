export const supportEmail = "hello@getstayguide.com";

// Keep provider response bodies out of logs: they may echo email addresses,
// message content or account links. Only retain a known machine-readable code.
const providerCodes = new Set(["validation_error", "authentication_error", "authorization_error", "restricted_api_key", "rate_limit_exceeded", "daily_quota_exceeded", "monthly_quota_exceeded"]);
export class EmailDeliveryError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`Email provider rejected delivery (${status}, ${code})`);
    this.name = "EmailDeliveryError";
  }
}

export function mailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM));
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
  const key = process.env.RESEND_API_KEY;
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
    const failure = await res.json().catch(() => null) as { name?: unknown } | null;
    const code = typeof failure?.name === "string" && providerCodes.has(failure.name) ? failure.name : "provider_error";
    throw new EmailDeliveryError(res.status, code);
  }
}
