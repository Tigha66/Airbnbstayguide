type Context = Record<string, string | number | boolean | null | undefined>;

export function monitoringConfigured() {
  return Boolean(process.env.SENTRY_DSN || process.env.LOGTAIL_SOURCE_TOKEN || process.env.STAYGUIDE_MONITORING_WEBHOOK);
}

export async function captureError(error: unknown, context: Context = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = {
    message,
    context,
    level: "error",
    timestamp: new Date().toISOString(),
  };
  console.error("[monitoring]", payload);
  const webhook = process.env.STAYGUIDE_MONITORING_WEBHOOK;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch (sendError) {
    console.error("[monitoring] delivery failed", sendError);
  }
}

