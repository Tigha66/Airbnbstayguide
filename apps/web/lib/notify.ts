import { after } from "next/server";
import { emailConfigured, escalationEmail, extraDecisionEmail, extraRequestEmail, looksLikeEmail, paymentFailedEmail, sendEmail, siteUrl } from "./email";
import { consumeRateLimit, extraRequestDetails, hostContact } from "./repo";

/** At most one escalation email per conversation in this many seconds. */
export const ESCALATION_EMAIL_WINDOW_SECONDS = 10 * 60;

/** Runs after the response when inside a request (guests never wait for email); directly otherwise. */
function inBackground(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error("[notify] failed", error));
  try {
    after(run);
  } catch {
    void run(); // outside a request scope (e.g. tests)
  }
}

/** True when this host will get emails about their guests (email is set up and they haven't turned it off). */
export async function hostWantsEmail(ownerId: string) {
  if (!emailConfigured()) return false;
  const host = await hostContact(ownerId).catch(() => null);
  return Boolean(host?.notifyEmail);
}

/**
 * Emails the host when the concierge hands a question over (at most once per conversation per
 * 10 minutes). Returns whether the host is notified by email, so the guest sees the right message.
 */
export async function notifyEscalation(input: { ownerId: string; threadId: string; propertyName: string; question: string; language: string }) {
  const host = emailConfigured() ? await hostContact(input.ownerId).catch(() => null) : null;
  if (!host?.notifyEmail) return false;
  inBackground(async () => {
    if (!(await consumeRateLimit(`notify-escalation:${input.threadId}`, 1, ESCALATION_EMAIL_WINDOW_SECONDS))) return;
    await sendEmail(escalationEmail({ to: host.email, hostName: host.name, propertyName: input.propertyName, question: input.question, language: input.language }));
  });
  return true;
}

/** Emails the host about a new extra request. */
export async function notifyExtraRequest(input: {
  ownerId: string;
  propertyName: string;
  extraName: string;
  guestName: string;
  guestContact: string;
  note: string;
  paidOnline: boolean;
}) {
  const host = emailConfigured() ? await hostContact(input.ownerId).catch(() => null) : null;
  if (!host?.notifyEmail) return false;
  const { ownerId, ...details } = input;
  void ownerId; // only used to find the host above
  inBackground(() => sendEmail(extraRequestEmail({ to: host.email, hostName: host.name, ...details })));
  return true;
}

/** Emails the guest (if they left an email address) when the host approves or declines their extra. */
export async function notifyExtraDecision(ownerId: string, requestId: string, approved: boolean) {
  if (!emailConfigured()) return false;
  const details = await extraRequestDetails(ownerId, requestId).catch(() => null);
  if (!details || !looksLikeEmail(details.guestContact)) return false;
  inBackground(() =>
    sendEmail(
      extraDecisionEmail({
        to: details.guestContact,
        guestName: details.guestName,
        propertyName: details.propertyName,
        extraName: details.extraName,
        approved,
        guideUrl: `${siteUrl()}/g/${details.slug}`,
      }),
    ),
  );
  return true;
}

/** Emails the host when a subscription payment fails (billing emails go out regardless of the notification switch). */
export async function notifyPaymentFailed(ownerId: string) {
  if (!emailConfigured()) return false;
  const host = await hostContact(ownerId).catch(() => null);
  if (!host) return false;
  inBackground(() => sendEmail(paymentFailedEmail({ to: host.email, hostName: host.name })));
  return true;
}
