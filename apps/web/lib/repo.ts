import { z } from "zod";
import { plans, sectionSchema, type GuideText, type Plan, type Property } from "@stayguide/shared";
import { query } from "./db";
import { parseManual, extractWifi, extractTime } from "./guide-parser";

export const extraSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000),
  price: z.number().int().min(0).max(1_000_000),
  icon: z.string().max(40),
  approval: z.boolean(),
});
export const propertyDataSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(2).max(120),
  slug: z.string().optional(),
  location: z.string().trim().min(2).max(200),
  address: z.string().trim().max(300).optional(),
  image: z.string().max(2000),
  status: z.enum(["published", "draft"]),
  description: z.string().max(12000),
  checkIn: z.string().max(40),
  checkOut: z.string().max(40),
  wifi: z.string().max(120),
  wifiPassword: z.string().max(120),
  hostPhone: z.string().max(40),
  sections: z.array(sectionSchema).max(60),
  extras: z.array(extraSchema).max(40),
});

export type User = { id: string; email: string; name: string | null; plan: Plan; notifyEmail?: boolean };

export async function upsertUser(email: string, name?: string | null, image?: string | null) {
  const [user] = await query<User>(
    `INSERT INTO users (email, name, image) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), image = COALESCE(EXCLUDED.image, users.image)
     RETURNING id, email, name, plan`,
    [email.toLowerCase(), name ?? null, image ?? null],
  );
  return user;
}
export async function getUser(id: string) {
  const [user] = await query<User>(`SELECT id, email, name, plan, notify_email AS "notifyEmail" FROM users WHERE id = $1`, [id]);
  return user ?? null;
}
export async function deleteUser(id: string) {
  // Translations are keyed by property id without a foreign key, so remove them explicitly.
  await query(`DELETE FROM guide_translations WHERE property_key IN (SELECT id FROM properties WHERE owner_id = $1)`, [id]);
  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

type PropertyRow = { id: string; slug: string; status: string; data: Property };
const toProperty = (r: PropertyRow): Property => ({ ...r.data, id: r.id, slug: r.slug, status: r.status as Property["status"] });

export async function listProperties(ownerId: string) {
  const rows = await query<PropertyRow>(
    `SELECT id, slug, status, data FROM properties WHERE owner_id = $1 ORDER BY created_at`,
    [ownerId],
  );
  return rows.map(toProperty);
}
export async function getOwnedProperty(ownerId: string, id: string) {
  const [row] = await query<PropertyRow>(
    `SELECT id, slug, status, data FROM properties WHERE owner_id = $1 AND id = $2`,
    [ownerId, id],
  );
  return row ? toProperty(row) : null;
}
export async function getPublishedProperty(slug: string) {
  const [row] = await query<PropertyRow & { owner_id: string }>(
    `SELECT id, slug, status, data, owner_id FROM properties WHERE slug = $1 AND status = 'published'`,
    [slug],
  );
  return row ? { property: toProperty(row), ownerId: row.owner_id } : null;
}

export function slugify(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "guide";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
const fallbackImage =
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80";

export class LimitError extends Error {}

export async function createProperty(
  owner: User,
  input: { name: string; location: string; address?: string; description: string },
  aiSections?: Property["sections"],
) {
  const limit = propertyLimit(owner);
  if (await propertyLimitReached(owner)) throw limitError(owner);
  const manual = input.description.trim();
  const sections = aiSections?.length ? aiSections : manual ? parseManual(manual) : [];
  const wifi = extractWifi(manual);
  const id = crypto.randomUUID();
  const slug = slugify(input.name);
  const property: Property = {
    id,
    slug,
    name: input.name,
    location: input.location,
    address: input.address?.trim() ?? "",
    image: fallbackImage,
    status: "published",
    description: `Welcome to ${input.name}. Everything you need for a wonderful stay is right here.`,
    checkIn: extractTime(manual, "in") || "3:00 PM",
    checkOut: extractTime(manual, "out") || "11:00 AM",
    wifi: wifi.network,
    wifiPassword: wifi.password,
    hostPhone: manual.match(/\+?\d[\d\s()-]{7,}\d/)?.[0] ?? "",
    sections,
    extras: [],
  };
  // Count and insert in one statement; the unique (owner, slot) index makes simultaneous
  // requests collide instead of both slipping under the plan's limit.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = await query(
        `INSERT INTO properties (id, owner_id, slug, status, data, slot)
         SELECT $1, $2, $3, $4, $5, COALESCE(MAX(slot), 0) + 1 FROM properties WHERE owner_id = $2
         HAVING count(*) < $6
         RETURNING id`,
        [id, owner.id, slug, property.status, JSON.stringify(property), limit],
      );
      if (!rows.length) throw limitError(owner);
      return property;
    } catch (error) {
      if (!String((error as { constraint?: string; message?: string })?.constraint ?? (error as Error)?.message).includes("properties_owner_slot_idx")) throw error;
    }
  }
  throw limitError(owner);
}
const propertyLimit = (owner: User) => plans[owner.plan]?.properties ?? 1;
const limitError = (owner: User) => {
  const limit = propertyLimit(owner);
  return new LimitError(`Your ${plans[owner.plan]?.name ?? "current"} plan includes ${limit} propert${limit === 1 ? "y" : "ies"}.`);
};
/** True when the host can't add another property on their plan (checked before any AI work). */
export async function propertyLimitReached(owner: User) {
  const [{ count }] = await query<{ count: string | number }>(`SELECT count(*) AS count FROM properties WHERE owner_id = $1`, [owner.id]);
  return Number(count) >= propertyLimit(owner);
}
export async function updateProperty(ownerId: string, id: string, data: z.infer<typeof propertyDataSchema>) {
  const existing = await getOwnedProperty(ownerId, id);
  if (!existing) return null;
  const next: Property = { ...data, id, slug: existing.slug };
  await query(
    `UPDATE properties SET data = $3, status = $4, updated_at = now() WHERE owner_id = $1 AND id = $2`,
    [ownerId, id, JSON.stringify(next), next.status],
  );
  return next;
}
export async function deleteProperty(ownerId: string, id: string) {
  const rows = await query(`DELETE FROM properties WHERE owner_id = $1 AND id = $2 RETURNING id`, [ownerId, id]);
  if (rows.length) await query(`DELETE FROM guide_translations WHERE property_key = $1`, [id]);
  return rows.length > 0;
}

/** Fixed-window rate limit stored in Postgres. Returns true when the request is allowed. */
export async function consumeRateLimit(bucket: string, max: number, windowSeconds: number) {
  const [row] = await query<{ count: number }>(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (bucket) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [bucket, windowSeconds],
  );
  return Number(row.count) <= max;
}
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
/**
 * Monthly AI allowance: the plan's messages per property, for at most the plan's property count
 * (at least one property). Shared by the concierge, the guide builder and guide translation.
 */
export function aiMessageLimit(plan: Plan, propertyCount: number) {
  const p = plans[plan] ?? plans.free;
  return p.messages * Math.min(Math.max(1, propertyCount), p.properties);
}
async function ownerAiLimit(ownerId: string) {
  const [row] = await query<{ plan: Plan; properties: string | number }>(
    `SELECT u.plan, (SELECT count(*) FROM properties p WHERE p.owner_id = u.id) AS properties FROM users u WHERE u.id = $1`,
    [ownerId],
  );
  return aiMessageLimit(row?.plan ?? "free", Number(row?.properties ?? 0));
}
/** The host's plan (for per-guide daily caps). */
export async function ownerPlan(ownerId: string): Promise<Plan> {
  const [row] = await query<{ plan: Plan }>(`SELECT plan FROM users WHERE id = $1`, [ownerId]);
  return row?.plan ?? "free";
}
/**
 * Reserves `units` AI calls from the owner's monthly allowance. Atomic and conditional, so the
 * counter never goes past the limit (analytics can't show 1,240/1,000). Returns false when the
 * allowance is used up. Give units back with refundAiUsage if the AI call then fails.
 */
export async function reserveAiUsage(ownerId: string, units = 1) {
  const limit = await ownerAiLimit(ownerId);
  if (units > limit) return false;
  const rows = await query(
    `INSERT INTO usage_counters (owner_id, month, messages) VALUES ($1, $2, $3)
     ON CONFLICT (owner_id, month) DO UPDATE SET messages = usage_counters.messages + EXCLUDED.messages
       WHERE usage_counters.messages + EXCLUDED.messages <= $4
     RETURNING messages`,
    [ownerId, monthKey(), units, limit],
  );
  return rows.length > 0;
}
/** Counts one concierge message against the owner's monthly allowance; false when it's used up. */
export async function consumeAiUsage(ownerId: string) {
  return reserveAiUsage(ownerId, 1);
}
/** Gives back AI calls that were reserved but never answered (e.g. the AI provider failed). */
export async function refundAiUsage(ownerId: string, units = 1) {
  await query(
    `UPDATE usage_counters SET messages = GREATEST(messages - $3, 0) WHERE owner_id = $1 AND month = $2`,
    [ownerId, monthKey(), units],
  );
}
/** Starts a named cooldown (e.g. after the AI provider says it's out of credit). */
export async function startCooldown(name: string, seconds: number) {
  await query(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES ($1, now(), $2)
     ON CONFLICT (bucket) DO UPDATE SET window_start = now(), count = EXCLUDED.count`,
    [`cooldown:${name}`, seconds],
  );
}
/** True while a cooldown started by startCooldown is still running. */
export async function inCooldown(name: string) {
  const rows = await query(
    `SELECT 1 FROM rate_limits WHERE bucket = $1 AND window_start + make_interval(secs => count) > now()`,
    [`cooldown:${name}`],
  );
  return rows.length > 0;
}

export async function recordView(propertyId: string) {
  await query(
    `INSERT INTO guide_views (property_id, day, views) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (property_id, day) DO UPDATE SET views = guide_views.views + 1`,
    [propertyId],
  );
}

export async function saveMessages(
  propertyId: string,
  threadId: string,
  messages: { role: "guest" | "assistant" | "host"; content: string; language: string; citations?: string[]; escalated?: boolean }[],
) {
  for (const m of messages)
    await query(
      `INSERT INTO chat_messages (property_id, thread_id, role, content, language, citations, escalated) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [propertyId, threadId, m.role, m.content, m.language, JSON.stringify(m.citations ?? []), m.escalated ?? false],
    );
}
export async function threadBelongsTo(threadId: string, propertyId: string) {
  const rows = await query(`SELECT 1 FROM chat_messages WHERE thread_id = $1 AND property_id <> $2 LIMIT 1`, [threadId, propertyId]);
  return rows.length === 0;
}
export async function threadMessages(propertyId: string, threadId: string) {
  return query<{ role: string; content: string; citations: string[]; created_at: string }>(
    `SELECT role, content, citations, created_at FROM chat_messages WHERE property_id = $1 AND thread_id = $2 ORDER BY created_at, seq`,
    [propertyId, threadId],
  );
}

export type InboxThread = {
  threadId: string;
  propertyId: string;
  propertyName: string;
  escalated: boolean;
  lastAt: string;
  messages: { role: string; content: string; createdAt: string }[];
};
export async function inbox(ownerId: string): Promise<InboxThread[]> {
  const rows = await query<{ thread_id: string; property_id: string; name: string; role: string; content: string; escalated: boolean; created_at: string }>(
    `SELECT m.thread_id, m.property_id, p.data->>'name' AS name, m.role, m.content, m.escalated, m.created_at
     FROM chat_messages m JOIN properties p ON p.id = m.property_id
     WHERE p.owner_id = $1 AND m.thread_id IN (
       SELECT thread_id FROM chat_messages m2 JOIN properties p2 ON p2.id = m2.property_id
       WHERE p2.owner_id = $1 GROUP BY thread_id ORDER BY max(m2.created_at) DESC LIMIT 50)
     ORDER BY m.created_at, m.seq`,
    [ownerId],
  );
  const threads = new Map<string, InboxThread>();
  for (const r of rows) {
    const t = threads.get(r.thread_id) ?? { threadId: r.thread_id, propertyId: r.property_id, propertyName: r.name, escalated: false, lastAt: String(r.created_at), messages: [] };
    // "Needs your help" until the host replies; a later unanswered question raises it again.
    if (r.role === "host") t.escalated = false;
    else if (r.escalated) t.escalated = true;
    t.lastAt = new Date(r.created_at).toISOString();
    t.messages.push({ role: r.role, content: r.content, createdAt: new Date(r.created_at).toISOString() });
    threads.set(r.thread_id, t);
  }
  return [...threads.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
export async function hostReply(ownerId: string, threadId: string, content: string) {
  const [row] = await query<{ property_id: string }>(
    `SELECT m.property_id FROM chat_messages m JOIN properties p ON p.id = m.property_id WHERE m.thread_id = $1 AND p.owner_id = $2 LIMIT 1`,
    [threadId, ownerId],
  );
  if (!row) return false;
  await saveMessages(row.property_id, threadId, [{ role: "host", content, language: "en" }]);
  return true;
}

export async function createExtraRequest(
  propertyId: string,
  extra: { id: string; name: string; price: number },
  guest: { name: string; contact: string; note: string },
  status: "pending" | "awaiting_payment" = "pending",
) {
  const [row] = await query<{ id: string }>(
    `INSERT INTO extra_requests (property_id, extra_id, extra_name, price, guest_name, guest_contact, note, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [propertyId, extra.id, extra.name, extra.price, guest.name, guest.contact, guest.note, status],
  );
  return row.id;
}
export async function attachExtraCheckout(id: string, sessionId: string) {
  await query(`UPDATE extra_requests SET checkout_session_id = $2 WHERE id = $1`, [id, sessionId]);
}
/** Webhook: a guest finished (or abandoned) Stripe Checkout for an extra. */
export async function settleExtraCheckout(sessionId: string, status: "pending" | "paid" | "expired", paymentIntentId: string | null) {
  const rows = await query(
    `UPDATE extra_requests SET status = $2, payment_intent_id = COALESCE($3, payment_intent_id) WHERE checkout_session_id = $1 AND status = 'awaiting_payment' RETURNING id`,
    [sessionId, status, paymentIntentId],
  );
  return rows.length > 0;
}
/** An extra request paid through a Checkout session, with what's needed to email its host. */
export async function extraRequestBySession(sessionId: string) {
  const [row] = await query<{ owner_id: string; property_name: string; extra_name: string; guest_name: string; guest_contact: string; note: string }>(
    `SELECT p.owner_id, p.data->>'name' AS property_name, r.extra_name, r.guest_name, r.guest_contact, r.note
       FROM extra_requests r JOIN properties p ON p.id = r.property_id WHERE r.checkout_session_id = $1`,
    [sessionId],
  );
  return row
    ? { ownerId: row.owner_id, propertyName: row.property_name, extraName: row.extra_name, guestName: row.guest_name, guestContact: row.guest_contact, note: row.note }
    : null;
}
export async function getOwnedExtraRequest(ownerId: string, id: string) {
  const [row] = await query<{ id: string; status: string; payment_intent_id: string | null }>(
    `SELECT r.id, r.status, r.payment_intent_id FROM extra_requests r JOIN properties p ON p.id = r.property_id WHERE r.id = $2 AND p.owner_id = $1`,
    [ownerId, id],
  );
  return row ?? null;
}
export type ExtraRequest = { id: string; propertyId: string; propertyName: string; extraName: string; price: number; guestName: string; guestContact: string; note: string; status: string; prepaid: boolean; createdAt: string };
export async function listExtraRequests(ownerId: string): Promise<ExtraRequest[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT r.*, p.data->>'name' AS property_name FROM extra_requests r JOIN properties p ON p.id = r.property_id WHERE p.owner_id = $1 AND r.status NOT IN ('awaiting_payment','expired') ORDER BY r.created_at DESC LIMIT 100`,
    [ownerId],
  );
  return rows.map((r) => ({ id: String(r.id), propertyId: String(r.property_id), propertyName: String(r.property_name), extraName: String(r.extra_name), price: Number(r.price), guestName: String(r.guest_name), guestContact: String(r.guest_contact), note: String(r.note), status: String(r.status), prepaid: Boolean(r.payment_intent_id), createdAt: new Date(r.created_at as string).toISOString() }));
}
export async function setExtraRequestStatus(ownerId: string, id: string, status: "approved" | "declined" | "paid" | "refunded") {
  const rows = await query(
    `UPDATE extra_requests r SET status = $3 FROM properties p WHERE r.id = $2 AND p.id = r.property_id AND p.owner_id = $1 RETURNING r.id`,
    [ownerId, id, status],
  );
  return rows.length > 0;
}

export async function analytics(ownerId: string) {
  const [views] = await query<{ total: string | null; last30: string | null }>(
    `SELECT sum(views) AS total, sum(views) FILTER (WHERE day > CURRENT_DATE - 30) AS last30 FROM guide_views v JOIN properties p ON p.id = v.property_id WHERE p.owner_id = $1`,
    [ownerId],
  );
  const [chats] = await query<{ questions: string; escalated: string }>(
    `SELECT count(*) FILTER (WHERE m.role = 'guest') AS questions, count(*) FILTER (WHERE m.role = 'assistant' AND m.escalated) AS escalated FROM chat_messages m JOIN properties p ON p.id = m.property_id WHERE p.owner_id = $1`,
    [ownerId],
  );
  const [extras] = await query<{ revenue: string | null; requests: string }>(
    `SELECT sum(r.price) FILTER (WHERE r.status IN ('approved','paid')) AS revenue, count(*) AS requests FROM extra_requests r JOIN properties p ON p.id = r.property_id WHERE p.owner_id = $1`,
    [ownerId],
  );
  const top = await query<{ content: string; n: string }>(
    `SELECT lower(content) AS content, count(*) AS n FROM chat_messages m JOIN properties p ON p.id = m.property_id WHERE p.owner_id = $1 AND role = 'guest' GROUP BY lower(content) ORDER BY n DESC LIMIT 5`,
    [ownerId],
  );
  const usage = await query<{ messages: number }>(`SELECT messages FROM usage_counters WHERE owner_id = $1 AND month = $2`, [ownerId, monthKey()]);
  const aiLimit = await ownerAiLimit(ownerId);
  const questions = Number(chats.questions);
  return {
    views: Number(views.total ?? 0),
    views30: Number(views.last30 ?? 0),
    questions,
    resolutionRate: questions ? Math.round(((questions - Number(chats.escalated)) / questions) * 100) : 0,
    extrasRevenue: Number(extras.revenue ?? 0),
    extraRequests: Number(extras.requests),
    topQuestions: top.map((t) => ({ question: t.content, count: Number(t.n) })),
    aiMessagesThisMonth: Number(usage[0]?.messages ?? 0),
    aiMessageLimit: aiLimit,
  };
}

export type Billing = {
  plan: Plan;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  stripeAccountId: string | null;
  payoutsReady: boolean;
  propertyCount: number;
};
export async function getBilling(userId: string): Promise<Billing | null> {
  const [r] = await query<Record<string, unknown>>(
    `SELECT u.plan, u.stripe_customer_id, u.stripe_subscription_id, u.subscription_status, u.stripe_account_id, u.payouts_ready,
            (SELECT count(*) FROM properties p WHERE p.owner_id = u.id) AS property_count
       FROM users u WHERE u.id = $1`,
    [userId],
  );
  if (!r) return null;
  return {
    plan: r.plan as Plan,
    stripeCustomerId: (r.stripe_customer_id as string) ?? null,
    stripeSubscriptionId: (r.stripe_subscription_id as string) ?? null,
    subscriptionStatus: (r.subscription_status as string) ?? null,
    stripeAccountId: (r.stripe_account_id as string) ?? null,
    payoutsReady: Boolean(r.payouts_ready),
    propertyCount: Number(r.property_count),
  };
}
export async function setStripeCustomer(userId: string, customerId: string) {
  await query(`UPDATE users SET stripe_customer_id = $2 WHERE id = $1`, [userId, customerId]);
}
export async function setStripeAccount(userId: string, accountId: string, ready: boolean) {
  await query(`UPDATE users SET stripe_account_id = $2, payouts_ready = $3 WHERE id = $1`, [userId, accountId, ready]);
}
/** Webhook: mirror a Stripe subscription onto the host. Matches by customer id, falling back to metadata.user_id. */
export async function applySubscription(input: { customerId: string; userId?: string; subscriptionId: string | null; status: string | null; plan: Plan }) {
  const rows = await query(
    `UPDATE users SET plan = $3, stripe_subscription_id = $4, subscription_status = $5, stripe_customer_id = $1
      WHERE stripe_customer_id = $1 OR ($2::uuid IS NOT NULL AND id = $2::uuid) RETURNING id`,
    [input.customerId, input.userId ?? null, input.plan, input.subscriptionId, input.status],
  );
  return rows.length > 0;
}
/** The host linked to a Stripe customer (used to re-check billing from webhooks). */
export async function userIdForCustomer(customerId: string) {
  const [r] = await query<{ id: string }>(`SELECT id FROM users WHERE stripe_customer_id = $1`, [customerId]);
  return r?.id ?? null;
}
/** Who to notify about a host's guests, and whether they want emails. */
export async function hostContact(ownerId: string) {
  const [row] = await query<{ email: string; name: string | null; notify_email: boolean }>(
    `SELECT email, name, notify_email FROM users WHERE id = $1`,
    [ownerId],
  );
  return row ? { email: row.email, name: row.name, notifyEmail: Boolean(row.notify_email) } : null;
}
export async function setNotifyEmail(userId: string, on: boolean) {
  await query(`UPDATE users SET notify_email = $2 WHERE id = $1`, [userId, on]);
}
/** Details of a host's extra request, for emails to the guest. */
export async function extraRequestDetails(ownerId: string, id: string) {
  const [row] = await query<{ guest_name: string; guest_contact: string; extra_name: string; property_name: string; slug: string }>(
    `SELECT r.guest_name, r.guest_contact, r.extra_name, p.data->>'name' AS property_name, p.slug
       FROM extra_requests r JOIN properties p ON p.id = r.property_id WHERE r.id = $2 AND p.owner_id = $1`,
    [ownerId, id],
  );
  return row
    ? { guestName: row.guest_name, guestContact: row.guest_contact, extraName: row.extra_name, propertyName: row.property_name, slug: row.slug }
    : null;
}
/** Records a Stripe event id; false when it was already processed (a duplicate delivery). */
export async function claimStripeEvent(id: string, type: string) {
  const rows = await query(`INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id`, [id, type]);
  return rows.length > 0;
}
/** Forgets a Stripe event so Stripe's retry is processed (handling failed). */
export async function releaseStripeEvent(id: string) {
  await query(`DELETE FROM stripe_events WHERE id = $1`, [id]);
}
/** Host who owns the given published property: used to route extras payments to their Connect account. */
export async function getPayoutAccount(ownerId: string) {
  const [r] = await query<{ stripe_account_id: string | null; payouts_ready: boolean }>(
    `SELECT stripe_account_id, payouts_ready FROM users WHERE id = $1`,
    [ownerId],
  );
  return r?.stripe_account_id && r.payouts_ready ? r.stripe_account_id : null;
}
export async function setExtraRequestStatusById(id: string, status: "pending" | "paid") {
  await query(`UPDATE extra_requests SET status = $2 WHERE id = $1`, [id, status]);
}
/** Forgets Stripe ids that no longer exist (e.g. after switching from test to live keys). */
export async function clearStripeCustomer(userId: string) {
  await query(
    `UPDATE users SET stripe_customer_id = NULL, stripe_subscription_id = NULL, subscription_status = NULL,
       plan = CASE WHEN stripe_subscription_id IS NULL THEN plan ELSE 'free' END WHERE id = $1`,
    [userId],
  );
}
export async function clearStripeAccount(userId: string) {
  await query(`UPDATE users SET stripe_account_id = NULL, payouts_ready = false WHERE id = $1`, [userId]);
}

export type AdminHostRow = {
  email: string;
  name: string | null;
  plan: Plan;
  subscriptionStatus: string | null;
  properties: number;
  published: number;
  aiMessagesThisMonth: number;
  aiMessageLimit: number;
  guestQuestions30d: number;
  payoutsReady: boolean;
  hasSubscription: boolean;
  signedUp: string;
};
/** Owner-only overview of every host account (read-only). */
export async function adminHosts(): Promise<AdminHostRow[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT u.email, u.name, u.plan, u.subscription_status, u.payouts_ready, u.created_at, u.stripe_subscription_id,
            (SELECT count(*) FROM properties p WHERE p.owner_id = u.id) AS properties,
            (SELECT count(*) FROM properties p WHERE p.owner_id = u.id AND p.status = 'published') AS published,
            COALESCE((SELECT messages FROM usage_counters c WHERE c.owner_id = u.id AND c.month = $1), 0) AS ai_messages,
            (SELECT count(*) FROM chat_messages m JOIN properties p ON p.id = m.property_id
              WHERE p.owner_id = u.id AND m.role = 'guest' AND m.created_at > now() - interval '30 days') AS questions_30d
       FROM users u
      ORDER BY properties DESC, u.created_at DESC`,
    [monthKey()],
  );
  return rows.map((r) => {
    const plan = (r.plan as Plan) in plans ? (r.plan as Plan) : "free";
    const properties = Number(r.properties);
    return {
      email: String(r.email),
      name: (r.name as string) ?? null,
      plan,
      subscriptionStatus: (r.subscription_status as string) ?? null,
      properties,
      published: Number(r.published),
      aiMessagesThisMonth: Number(r.ai_messages),
      aiMessageLimit: aiMessageLimit(plan, properties),
      guestQuestions30d: Number(r.questions_30d),
      payoutsReady: Boolean(r.payouts_ready),
      hasSubscription: Boolean(r.stripe_subscription_id) && r.subscription_status !== "canceled",
      signedUp: new Date(r.created_at as string).toISOString().slice(0, 10),
    };
  });
}

/** Cached AI translation of a guide, only if it matches the guide's current text. */
export async function getGuideTranslation(propertyKey: string, language: string, sourceHash: string) {
  const [row] = await query<{ data: GuideText }>(
    // A complete translation is reused until the host edits the guide; a partial one for 6 hours.
    `SELECT data FROM guide_translations WHERE property_key = $1 AND language = $2 AND source_hash = $3
       AND (complete OR created_at > now() - interval '6 hours')`,
    [propertyKey, language, sourceHash],
  );
  return row?.data ?? null;
}
export async function saveGuideTranslation(propertyKey: string, language: string, sourceHash: string, data: GuideText, complete = true) {
  await query(
    `INSERT INTO guide_translations (property_key, language, source_hash, data, complete) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (property_key, language) DO UPDATE SET source_hash = EXCLUDED.source_hash, data = EXCLUDED.data,
       complete = EXCLUDED.complete, created_at = now()`,
    [propertyKey, language, sourceHash, JSON.stringify(data), complete],
  );
}

/**
 * Owner action: switch an account to the sales-led Hotel plan (or back to Free).
 * Refused for accounts with an active Stripe subscription, whose plan Stripe controls.
 */
export async function setManagedPlan(email: string, plan: "hotel" | "free") {
  const rows = await query<{ id: string }>(
    `UPDATE users SET plan = $2
      WHERE lower(email) = lower($1)
        AND (stripe_subscription_id IS NULL OR subscription_status = 'canceled')
      RETURNING id`,
    [email, plan],
  );
  return rows.length > 0;
}
