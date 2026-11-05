import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Logo } from "@/components/ui";
import { originFromHeaders, requestPasswordReset } from "@/lib/account-email";
import { mailerConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  async function sendReset(formData: FormData) {
    "use server";
    try {
      const available = await requestPasswordReset({ email: formData.get("email"), origin: originFromHeaders(await headers()) });
      if (!available) throw new Error("Email unavailable");
    } catch (error) {
      console.error("[auth] password reset failed", error);
      redirect("/forgot-password?error=1");
    }
    redirect("/forgot-password?sent=1");
  }
  return (
    <main className="auth-simple">
      <Logo />
      <section className="card panel form-grid">
        <div>
          <h1>Reset your password</h1>
          <p>Enter your account email. If it has a password login, we’ll send a secure reset link.</p>
        </div>
        {!mailerConfigured() && (
          <div className="notice" role="status">
            Password reset email is not configured on this deployment yet. Contact{" "}
            <a href="mailto:hello@getstayguide.com">hello@getstayguide.com</a>.
          </div>
        )}
        {params.sent && <div className="notice" role="status">If this address has a password account, a reset link will arrive shortly. Check your spam folder too. The link expires in 1 hour.</div>}
        {params.error && <div className="notice" role="alert">We couldn’t send the reset email. Please try again or contact support.</div>}
        <form action={sendReset} className="form-grid">
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required maxLength={254} />
          </label>
          <button className="button" disabled={!mailerConfigured()}>Send reset link</button>
        </form>
        <Link className="text-link" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
