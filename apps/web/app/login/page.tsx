import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Login } from "@/components/login";
import { appleConfigured, auth, authConfigured, googleConfigured, signIn } from "@/auth";
import { requestLocale } from "@/lib/request-locale";
import { makeTr } from "@/lib/app-i18n";
import { registerPasswordUser } from "@/lib/password-login";
import { originFromHeaders, sendVerificationEmail } from "@/lib/account-email";

function loginRedirect(email: FormDataEntryValue | null, error: string, register = false): never {
  const value = String(email ?? "").trim().toLowerCase();
  const suffix = value ? `&email=${encodeURIComponent(value)}` : "";
  redirect(`/login?error=${encodeURIComponent(error)}${suffix}${register ? "&mode=register" : ""}`);
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
  searchParams: Promise<{ error?: string; email?: string; mode?: string; created?: string }>;
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
  async function register(formData: FormData) {
    "use server";
    const emailInput = formData.get("email");
    let user: Awaited<ReturnType<typeof registerPasswordUser>>;
    try {
      user = await registerPasswordUser({ email: emailInput, name: formData.get("name"), password: formData.get("password") });
      try {
        await sendVerificationEmail({ userId: user.id, email: user.email, origin: originFromHeaders(await headers()) });
      } catch (error) {
        console.error("[auth] verification email failed", error);
      }
    } catch {
      loginRedirect(emailInput, "registration", true);
    }
    redirect(`/login?email=${encodeURIComponent(String(emailInput ?? ""))}&created=1`);
  }
  async function password(formData: FormData) {
    "use server";
    const email = formData.get("email");
    try {
      await signIn("password", {
        email: String(email ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: "/dashboard",
      });
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      loginRedirect(email, "password-invalid");
    }
  }
  return (
    <Login
      configured={configured}
      googleConfigured={googleConfigured()}
      appleConfigured={appleConfigured()}
      error={error}
      email={params.email}
      register={params.mode === "register"}
      created={params.created === "1"}
      googleAction={google}
      appleAction={apple}
      registerAction={register}
      passwordAction={password}
      locale={await requestLocale()}
    />
  );
}
