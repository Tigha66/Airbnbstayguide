/** Reports a server-side error to Sentry with tags (no-op without SENTRY_DSN). Never throws. */
export async function reportError(error: unknown, tags: Record<string, string> = {}) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { tags });
  } catch {
    /* monitoring must never break a request */
  }
}
