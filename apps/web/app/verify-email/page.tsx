import Link from "next/link";
import { Logo } from "@/components/ui";
import { verifyEmailToken } from "@/lib/account-email";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token).catch(() => false) : false;
  return (
    <main className="auth-simple">
      <Logo />
      <section className="card panel form-grid">
        <div>
          <h1>{ok ? "Email verified" : "Verification link expired"}</h1>
          <p>
            {ok
              ? "Your StayGuide account email is verified."
              : "This verification link is invalid or expired. Sign in and use the dashboard notice to request help if needed."}
          </p>
        </div>
        <Link className="button" href="/dashboard">Go to dashboard</Link>
      </section>
    </main>
  );
}
