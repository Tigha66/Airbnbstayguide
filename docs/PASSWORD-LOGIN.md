# Email and password accounts

The login page now offers Create account (name, email, password) and Sign in
(email, password), alongside the existing Google option. No code or email is
sent during these flows. Passwords must be 12-128 characters and are stored as
salted scrypt hashes, never plaintext. Sign-in attempts are rate limited.

Deploy with DATABASE_URL and AUTH_SECRET. The existing web build runs the
idempotent schema migration, which adds users.password_hash. Google continues
to use AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET. Resend is no longer needed for login.

Existing Google accounts must continue using Google. Registration cannot add a
password to an existing account. Password accounts cannot be automatically
linked to Google or Apple by matching an unverified email. Administrator emails
are reserved for OAuth sign-in. Existing email-code-only users cannot register
over their account; account recovery requires a separately verified process.

Email ownership verification and password reset are not implemented. The
registration form warns that reset is unavailable. Do not treat a password
account's email as verified or use it to grant access to existing data.

After deployment, create a new test account, sign in with its password, sign
out, and sign in again. Confirm an incorrect password fails and that an existing
Google account still signs in through Google. Registration with an existing
email must fail without altering that account.
