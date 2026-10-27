import { NextResponse } from "next/server";
import { z } from "zod";
import { requireHost } from "@/lib/session";
import { safeOrigin, parseJson } from "@/lib/api";
import { hasManagerAccess, consumeRateLimit } from "@/lib/repo";
import { listOutbox, listPmsConnections, createOutboxDraft, approveOutbox, cancelOutbox, pausePmsConnection } from "@/lib/pms-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function manager() {
  const host = await requireHost();
  if ("response" in host) return host;
  if (!host.user.emailVerified) return { response: response({ error: "Verify your email first" }, 403) };
  if (!await hasManagerAccess(host.user.id)) return { response: response({ error: "Manager plan required" }, 403) };
  return host;
}
export async function GET() {
  const host = await manager();
  if ("response" in host) return host.response;
  try {
    const [messages, connections] = await Promise.all([listOutbox(host.user.id), listPmsConnections(host.user.id)]);
    return response({ messages, connections, deliveryAvailable: false, setupRequired: "Authorised PMS connection and live delivery verification required" });
  } catch { return response({ error: "PMS outbox database migration required" }, 503); }
}
export async function POST(request: Request) {
  if (!safeOrigin(request)) return response({ error: "Invalid origin" }, 403);
  const host = await manager();
  if ("response" in host) return host.response;
  let body: unknown;
  try { body = parseJson(await request.text()); } catch { return response({ error: "Invalid draft" }, 400); }
  try {
    if (!await consumeRateLimit(`pms-draft:${host.user.id}`, 30, 3600)) return response({ error: "Too many drafts; try again later" }, 429);
    const message = await createOutboxDraft(host.user.id, body);
    return message ? response({ message }, 201) : response({ error: "Verified connection/property mapping required, or duplicate key has different content" }, 409);
  } catch (e) {
    if (e instanceof z.ZodError || (e instanceof Error && /Schedule|time zone/i.test(e.message))) return response({ error: "Invalid draft or schedule" }, 400);
    return response({ error: "Could not save PMS draft" }, 503);
  }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), id: z.string().uuid(), contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  z.object({ action: z.literal("cancel"), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("pause"), id: z.string().uuid(), paused: z.boolean() }).strict(),
]);
export async function PATCH(request: Request) {
  if (!safeOrigin(request)) return response({ error: "Invalid origin" }, 403);
  const host = await manager();
  if ("response" in host) return host.response;
  let data;
  try { data = actionSchema.parse(parseJson(await request.text())); } catch { return response({ error: "Invalid action" }, 400); }
  try {
    const changed = data.action === "approve" ? await approveOutbox(host.user.id, data.id, data.contentHash)
      : data.action === "cancel" ? await cancelOutbox(host.user.id, data.id)
        : await pausePmsConnection(host.user.id, data.id, data.paused);
    return changed ? response({ updated: true }) : response({ error: "Item unavailable, changed, or no longer eligible" }, 409);
  } catch { return response({ error: "Could not update PMS outbox" }, 503); }
}
