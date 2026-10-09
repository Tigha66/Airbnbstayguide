import { NextResponse } from "next/server";
import { requireHost } from "@/lib/session";
import { deleteUser } from "@/lib/repo";
import { safeOrigin } from "@/lib/api";
import { cancelSubscriptionForDeletion } from "@/lib/billing";
/** Deletes the host and (via ON DELETE CASCADE) all their properties, chats and requests. */
export async function DELETE(request: Request) {
  if (!safeOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const host = await requireHost();
  if ("response" in host) return host.response;
  // Stop billing first: if the subscription can't be cancelled, keep the account so it can be retried.
  try {
    await cancelSubscriptionForDeletion(host.user.id);
  } catch (error) {
    console.error("[account] subscription cancel failed; account not deleted", error);
    return NextResponse.json(
      { error: "We couldn't cancel your subscription, so nothing was deleted. Please try again in a minute or contact hello@getstayguide.com." },
      { status: 502 },
    );
  }
  await deleteUser(host.user.id);
  return NextResponse.json({ deleted: true });
}
