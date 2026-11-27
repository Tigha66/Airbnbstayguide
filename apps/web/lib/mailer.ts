export const supportEmail = "abdelhaktirha@gmail.com";

export function mailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM));
}

export async function sendEmail({
  to,
  subject,
  text,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!key || !from) throw new Error("Email is not configured");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers,
    body: JSON.stringify({ from, to: [to], reply_to: supportEmail, subject, text }),
  });
  if (!res.ok) {
    throw new Error("Email provider rejected delivery (" + res.status + ")");
  }
}
