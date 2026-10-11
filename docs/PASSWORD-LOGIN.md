# Email and password accounts

The login page now offers Create account (name, email, password) and Sign in
(email, password), alongside the existing Google option. Passwords must be 12-128 characters and are stored as
salted scrypt hashes, never plaintext. Sign-in attempts are rate limited.

Deploy with DATABASE_URL and AUTH_SECRET. The existing web build runs the
idempotent schema migration, which adds users.password_hash,
users.email_verified_at, and account_email_tokens. Google continues to use
AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.

Email verification and password reset use Resend. Set RESEND_API_KEY and
EMAIL_FROM in production. If those variables are missing, users can still sign
in with password or Google, but reset/verification emails are disabled and the
forgot-password page points them to support.

Existing Google accounts must continue using Google. Registration cannot add a
password to an existing account. Password accounts cannot be automatically
linked to Google or Apple by matching an unverified email. Administrator emails
are reserved for OAuth sign-in. Existing email-code-only users cannot register
over their account; account recovery requires a separately verified process.

New password registrations trigger a verification email when email delivery is
configured. Existing password accounts are marked verified by the schema
migration to avoid locking out current hosts.

After deployment, create a new test account, sign in with its password, sign
out, sign in again, verify the email link, and test the forgot-password reset.
Confirm an incorrect password fails and that an existing Google account still
signs in through Google. Registration with an existing email must fail without
altering that account.
