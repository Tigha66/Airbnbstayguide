import { redirect } from "next/navigation";
import { Login } from "@/components/login";
import { appleConfigured, auth, authConfigured, googleConfigured, signIn } from "@/auth";
import { requestLocale } from "@/lib/request-locale";
import { makeTr } from "@/lib/app-i18n";
import { emailLoginConfigured, requestEmailLoginCode } from "@/lib/email-login";

function loginRedirect(email: FormDataEntryValue | null, error: string): never {
  const value = String(email ?? "").trim().toLowerCase();
  const suffix = value ? `&email=${encodeURIComponent(value)}` : "";
  redirect(`/login?error=${encodeURIComponent(error)}${suffix}`);
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

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
    const emailInput = formData.get("email");
    let email: string;
    try {
      email = await requestEmailLoginCode(emailInput);
    } catch (error) {
      console.error("[login] email code request failed", error);
      loginRedirect(emailInput, "email-code-send");
    }
    redirect(`/login?email=${encodeURIComponent(email)}&sent=1`);
  }
  async function emailCode(formData: FormData) {
    "use server";
    const email = formData.get("email");
    try {
      await signIn("email-code", {
        email: String(email ?? ""),
        code: String(formData.get("code") ?? ""),
        redirectTo: "/dashboard",
      });
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      console.error("[login] email code sign-in failed", error);
      loginRedirect(email, "email-code-invalid");
    }
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
