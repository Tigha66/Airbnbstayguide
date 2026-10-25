import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { authConfigured } from "@/auth";
import { requireHost } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { adminHosts } from "@/lib/repo";
import { AdminOverview } from "@/components/admin-overview";
import { aiHealthCheck } from "@/lib/ai";

export const metadata: Metadata = { title: "Owner overview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!authConfigured()) notFound();
  const host = await requireHost();
  if ("response" in host) redirect("/login");
  const me = host.user;
  // Anyone else gets a plain 404, so the page's existence isn't revealed.
  if (!me || !isAdminEmail(me.email)) notFound();
  const [hosts, ai] = await Promise.all([adminHosts(), aiHealthCheck()]);
  return <AdminOverview hosts={hosts} ai={ai} />;
}
