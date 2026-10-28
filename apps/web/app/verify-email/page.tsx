import Link from "next/link";
import { Logo } from "@/components/ui";
import { redirect } from "next/navigation";
import { tokenLooksValid, verifyEmailToken } from "@/lib/account-email";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  // Opening a link (including email security scanners) must not consume it.
  const valid = token && token.length <= 256 ? await tokenLooksValid(token, "verify_email").catch(() => false) : false;
  async function confirm(formData: FormData) {
    "use server";
    const token = String(formData.get("token") ?? "");
    const ok = token.length <= 256 && await verifyEmailToken(token).catch(() => false);
    redirect(ok ? "/verify-email?done=1" : "/verify-email");
  }
  return (
    <main className="auth-simple">
      <Logo />
      <section className="card panel form-grid">
        <div>
          <h1>{done === "1" ? "Email verification complete" : valid ? "Verify your email" : "Verification link expired"}</h1>
          <p>
            {done === "1"
              ? "Sign in to see your account’s current verification status."
              : valid ? "Confirm below to verify your StayGuide email address."
              : "This link is invalid, expired or already used. Sign in and request a new verification email from your dashboard."}
          </p>
        </div>
        {valid && done !== "1" && <form action={confirm}>
          <input type="hidden" name="token" value={token} />
          <button className="button">Verify my email</button>
        </form>}
        <Link className="button" href="/dashboard">Go to dashboard</Link>
      </section>
    </main>
  );
}
