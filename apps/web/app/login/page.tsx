import { redirect } from "next/navigation";
import { Login } from "@/components/login";
import { auth, authConfigured, signIn } from "@/auth";
export const metadata = { title: "Welcome back" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const configured = authConfigured();
  const { error, returnTo: requestedReturnTo } = await searchParams;
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/dashboard";
  if (configured && (await auth())?.user) redirect(returnTo);
  async function google() {
    "use server";
    await signIn("google", { redirectTo: returnTo });
  }
  return <Login configured={configured} error={error} googleAction={google} />;
}
