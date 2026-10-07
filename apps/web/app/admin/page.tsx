import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth, authConfigured } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { adminHosts, getUser } from "@/lib/repo";
import { AdminOverview } from "@/components/admin-overview";

export const metadata: Metadata = { title: "Owner overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!authConfigured()) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await getUser(session.user.id);
  // Anyone else gets a plain 404, so the page's existence isn't revealed.
  if (!me || !isAdminEmail(me.email)) notFound();
  return <AdminOverview hosts={await adminHosts()} />;
}
