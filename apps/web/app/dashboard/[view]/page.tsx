import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
const views = [
  "properties",
  "editor",
  "inbox",
  "extras",
  "analytics",
  "share",
  "billing",
  "settings",
];
export function generateStaticParams() {
  return views.map((view) => ({ view }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  return <Dashboard view={view} />;
}
