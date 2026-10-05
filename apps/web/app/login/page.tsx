import { redirect } from "next/navigation";
import { Login } from "@/components/login";
import { auth, authConfigured, signIn } from "@/auth";
export const metadata = { title: "Welcome back" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = authConfigured();
  if (configured && (await auth())?.user) redirect("/dashboard");
  const { error } = await searchParams;
  async function google() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }
  return <Login configured={configured} error={error} googleAction={google} />;
}
