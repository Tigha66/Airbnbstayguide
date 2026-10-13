import Link from "next/link";
import { Apple, ArrowRight } from "lucide-react";
import { Logo } from "./ui";
import { makeTr } from "@/lib/app-i18n";
import { siteDir, type SiteLocale } from "@/lib/site-i18n";
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

function loginErrorMessage(tr: ReturnType<typeof makeTr>, error?: string) {
  switch (error) {
    case "registration":
      return tr("Could not create this account. Check your details, or sign in if you already have an account. Existing Google accounts should continue with Google.");
    case "password-invalid":
    case "CredentialsSignin":
      return tr("That email and password did not sign in. If this is your first time, create an account first, or continue with Google.");
    default:
      return tr("We couldn’t sign you in. Please try again.");
  }
}

export function Login({
  configured,
  googleConfigured,
  appleConfigured,
  error,
  email,
  register = false,
  created = false,
  verificationSent = false,
  googleAction,
  appleAction,
  registerAction,
  passwordAction,
  locale = "en",
}: {
  configured: boolean;
  googleConfigured: boolean;
  appleConfigured: boolean;
  error?: string;
  email?: string;
  register?: boolean;
  created?: boolean;
  verificationSent?: boolean;
  googleAction: () => Promise<void>;
  appleAction: () => Promise<void>;
  registerAction: (formData: FormData) => Promise<void>;
  passwordAction: (formData: FormData) => Promise<void>;
  locale?: SiteLocale;
}) {
  const tr = makeTr(locale);
  return (
    <div className="login-page" lang={locale} dir={siteDir(locale)}>
      <div className="login-art">
        <Logo />
        <div>
          <h1>
            {tr("Good hosts make")}
            <br />
            {tr("great stays.")}
            <br />
            {tr("Welcome home.")}
          </h1>
          <p className="login-art-sub">
            {tr("A little less work. A little more hospitality.")}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85"
            alt={tr("A warm and welcoming living room")}
          />
        </div>
        <small>{tr("Thoughtful hosting starts here.")}</small>
      </div>
      <main className="login-form">
        <Logo />
        <h1>{tr(register ? "Create account" : "Sign in to your account")}</h1>
        <p>{tr(register ? "Create your StayGuide account." : "Welcome back. Choose a secure sign-in option to continue.")}</p>
        {configured ? (
          <div className="login-options">
            {googleConfigured && (
              <form action={googleAction}>
                <button className="button" type="submit">
                  <GoogleMark />
                  {tr("Continue with Google")}
                </button>
              </form>
            )}
            {appleConfigured && (
              <form action={appleAction}>
                <button className="button secondary" type="submit">
                  <Apple size={16} />
                  {tr("Continue with Apple")}
                </button>
              </form>
            )}
            <div className="login-mode-switch" aria-label={tr("Choose account action")}>
              <Link
                className={!register ? "active" : ""}
                aria-current={!register ? "page" : undefined}
                href="/login"
              >
                {tr("Sign in")}
              </Link>
              <Link
                className={register ? "active" : ""}
                aria-current={register ? "page" : undefined}
                href="/login?mode=register"
              >
                {tr("Create account")}
              </Link>
            </div>
            <div className="email-login">
              <form action={register ? registerAction : passwordAction} key={register ? "register" : "signin"}>
                {register && <><label htmlFor="login-name">{tr("Name")}</label><input id="login-name" name="name" autoComplete="name" required maxLength={120} /></>}
                <label htmlFor="login-email">{tr("Email address")}</label>
                <input id="login-email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={email ?? ""} placeholder="you@example.com" />
                <label htmlFor="login-password">{tr("Password")}</label>
                <input id="login-password" name="password" type="password" required minLength={12} maxLength={128} autoComplete={register ? "new-password" : "current-password"} aria-describedby={register ? "password-hint" : undefined} />
                {register && <small id="password-hint">{tr("Use 12 to 128 characters.")}</small>}
                <button className="button" type="submit">{tr(register ? "Create account" : "Sign in")}</button>
              </form>
              <p className="login-mode-help">
                {register
                  ? tr("Already registered? Use Sign in above.")
                  : tr("First time using email and password? Use Create account above.")}
              </p>
              {!register && <Link className="text-link" href="/forgot-password">{tr("Forgot password?")}</Link>}
            </div>
          </div>
        ) : (
          <div className="notice" role="status">
            {tr("Live accounts are not connected yet. Explore the demo below.")}
          </div>
        )}
        {created && <div className="notice" role="status">{verificationSent
          ? tr("Account created. Check your email to verify your address, then sign in with your password.")
          : tr("Account created. You can sign in with your password. We couldn’t send a verification email; contact support for help.")}</div>}
        {error && (
          <div className="notice" role="alert">
            {loginErrorMessage(tr, error)}
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
          {tr("or explore without signing in")}
        </div>
        <Link className="button secondary" href="/dashboard">
          {tr("Explore the demo")}
          <ArrowRight size={15} />
        </Link>
        <small>
          {tr("By continuing, you agree to our")} <Link href="/legal/terms">{tr("Terms")}</Link>{" "}
          {tr("and")} <Link href="/legal/privacy">{tr("Privacy Policy")}</Link>.
        </small>
      </main>
    </div>
  );
}
