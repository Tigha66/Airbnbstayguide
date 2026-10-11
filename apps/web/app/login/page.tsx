import { redirect } from "next/navigation";
import { Login } from "@/components/login";
import { appleConfigured, auth, authConfigured, googleConfigured, signIn } from "@/auth";
import { requestLocale } from "@/lib/request-locale";
import { makeTr } from "@/lib/app-i18n";
import { emailLoginConfigured, requestEmailLoginCode } from "@/lib/email-login";
export async function generateMetadata() {
  return { title: makeTr(await requestLocale())("Welcome back") };
}
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; sent?: string }>;
}) {
  const configured = authConfigured();
  if (configured && (await auth())?.user) redirect("/dashboard");
  const { error } = await searchParams;
  const params = await searchParams;
  async function google() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }
  async function apple() {
    "use server";
    await signIn("apple", { redirectTo: "/dashboard" });
  }
  async function requestCode(formData: FormData) {
    "use server";
    const email = await requestEmailLoginCode(formData.get("email"));
    redirect(`/login?email=${encodeURIComponent(email)}&sent=1`);
  }
  async function emailCode(formData: FormData) {
    "use server";
    await signIn("email-code", {
      email: String(formData.get("email") ?? ""),
      code: String(formData.get("code") ?? ""),
      redirectTo: "/dashboard",
    });
  }
  return (
    <Login
      configured={configured}
      googleConfigured={googleConfigured()}
      appleConfigured={appleConfigured()}
      emailConfigured={emailLoginConfigured()}
      error={error}
      email={params.email}
      sent={params.sent === "1"}
      googleAction={google}
      appleAction={apple}
      requestEmailCodeAction={requestCode}
      emailCodeAction={emailCode}
      locale={await requestLocale()}
    />
  );
}
