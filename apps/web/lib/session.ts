import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { getUser, type User } from "./repo";

/** Resolves the signed-in host, or returns an error response to send back. */
export async function requireHost(): Promise<{ user: User } | { response: NextResponse }> {
  if (!authConfigured())
    return { response: NextResponse.json({ error: "Accounts are not configured yet.", code: "SERVICE_NOT_CONFIGURED" }, { status: 503 }) };
  const session = await auth();
  const id = session?.user?.id;
  const user = id ? await getUser(id) : null;
  if (!user) return { response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  return { user };
}
