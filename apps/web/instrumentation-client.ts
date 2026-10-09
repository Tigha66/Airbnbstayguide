// Browser error monitoring with Sentry: only downloaded when NEXT_PUBLIC_SENTRY_DSN is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn)
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({ dsn, environment: process.env.NEXT_PUBLIC_VERCEL_ENV, tracesSampleRate: 0, dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false } }),
  );
