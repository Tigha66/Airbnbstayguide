import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteUser, getBilling, updateProfile } from "@/lib/repo";
import { parseJson, safeOrigin } from "@/lib/api";
/** Deletes the host and (via ON DELETE CASCADE) all their properties, chats and requests. */
export async function DELETE(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  const billing = await getBilling(host.user.id);
  if (billing?.stripeSubscriptionId && !["canceled", "incomplete_expired"].includes(billing.subscriptionStatus ?? ""))
    return NextResponse.json({ error: "Cancel your subscription in Manage billing before deleting the account. Your data has been kept." }, { status: 409 });
  await deleteUser(host.user.id);
  return NextResponse.json({ deleted: true });
}

export async function PATCH(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  try { return NextResponse.json({ user: await updateProfile(host.user.id, parseJson(await request.text())) }); }
  catch { return NextResponse.json({ error: "Use a name up to 50 characters and organization up to 100 characters." }, { status: 400 }); }
}
