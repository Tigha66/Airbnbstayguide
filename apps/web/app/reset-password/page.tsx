import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { resetPassword, tokenLooksValid } from "@/lib/account-email";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const valid = token ? await tokenLooksValid(token, "reset_password").catch(() => false) : false;
  async function reset(formData: FormData) {
    "use server";
    const token = String(formData.get("token") ?? "");
    try {
      await resetPassword({ token, password: formData.get("password") });
    } catch {
      redirect(`/reset-password?token=${encodeURIComponent(token)}&error=1`);
    }
    redirect("/reset-password?done=1");
  }
  return (
    <main className="auth-simple">
      <Logo />
      <section className="card panel form-grid">
        <div>
          <h1>Create a new password</h1>
          <p>Use 12 to 128 characters. After this, sign in with your new password.</p>
        </div>
        {params.done ? (
          <>
            <div className="notice" role="status">Password updated. You can sign in now.</div>
            <Link className="button" href="/login">Sign in</Link>
          </>
        ) : valid ? (
          <form action={reset} className="form-grid">
            <input type="hidden" name="token" value={token} />
            <label>
              New password
              <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
            </label>
            {params.error && <div className="notice" role="alert">This reset link could not be used. Request a fresh link if it expired.</div>}
            <button className="button">Update password</button>
          </form>
        ) : (
          <>
            <div className="notice" role="alert">This reset link is invalid or expired.</div>
            <Link className="button" href="/forgot-password">Request a new link</Link>
          </>
        )}
      </section>
    </main>
  );
}
