import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./ui";
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
export function Login({
  configured,
  error,
  googleAction,
}: {
  configured: boolean;
  error?: string;
  googleAction: () => Promise<void>;
}) {
  return (
    <div className="login-page">
      <div className="login-art">
        <Logo />
        <div>
          <h1>
            Good hosts make
            <br />
            great stays.
            <br />
            Welcome home.
          </h1>
          <p className="login-art-sub">
            A little less work. A little more hospitality.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85"
            alt="A warm and welcoming living room"
          />
        </div>
        <small>Thoughtful hosting starts here.</small>
      </div>
      <main className="login-form">
        <Logo />
        <h1>Sign in to your account</h1>
        <p>Welcome back. Sign in with your Google account to continue.</p>
        {configured ? (
          <form action={googleAction}>
            <button className="button" type="submit">
              <GoogleMark />
              Continue with Google
            </button>
          </form>
        ) : (
          <div className="notice" role="status">
            Live accounts are not connected yet. Explore the demo below.
          </div>
        )}
        {error && (
          <div className="notice" role="alert">
            We couldn’t sign you in. Please try again.
          </div>
        )}
        <div
          style={{
            textAlign: "center",
            margin: "24px 0",
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          or explore without signing in
        </div>
        <Link className="button secondary" href="/dashboard">
          Explore the demo
          <ArrowRight size={15} />
        </Link>
        <small>
          By continuing, you agree to our <Link href="/legal/terms">Terms</Link>{" "}
          and <Link href="/legal/privacy">Privacy Policy</Link>.
        </small>
      </main>
    </div>
  );
}
