/** Trial eligibility uses the immutable signup time, never a browser clock or Stripe trial. */
export const TRIAL_DAYS = 14;
export const TRIAL_LAUNCH_AT = "2026-11-05T00:00:00.000Z";
// All expressions use the server-owned users row aliased as u. Paid plans win.
export const trialActiveSql = `(u.plan = 'free' AND u.stripe_subscription_id IS NULL
  AND u.email_verified_at IS NOT NULL
  AND u.created_at >= '${TRIAL_LAUNCH_AT}'::timestamptz
  AND u.created_at <= now() AND u.created_at + interval '14 days' > now())`;
export const effectivePlanSql = `(CASE WHEN ${trialActiveSql} THEN 'pro' ELSE u.plan END)`;
export const trialEndsSql = `(CASE WHEN u.created_at >= '${TRIAL_LAUNCH_AT}'::timestamptz
  AND u.plan = 'free' AND u.stripe_subscription_id IS NULL
  THEN u.created_at + interval '14 days' ELSE NULL END)`;
