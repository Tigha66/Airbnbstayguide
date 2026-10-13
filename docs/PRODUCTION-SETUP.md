# Finish StayGuide production configuration

The application runs on Vercel with Neon Postgres. Account verification and
password reset use Resend. Configure credentials in the hosting dashboard, not
in Git or chat. Keep existing working database, authentication and payment values.

## 1. Deploy the repaired code

In Vercel, open the StayGuide project and check Settings > Git for the connected
repository and production branch. The production code must include commit
`a6dbc51` (account email feedback, health reporting and host translations).
If that commit is still on the agent branch, use this chat's `/merge` command
to merge into the configured production branch. Automatic pushing of the agent
branch alone does not necessarily update production.

Confirm these existing project settings:

- Root Directory: `apps/web`
- Framework: Next.js
- Build Command: `pnpm build`
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Include files outside the root directory for the shared workspace package.
- Production domain: `www.getstayguide.com`

The build applies the database migration before building the app. Check the
deployment build log for migration errors. Do not seed or replace the production
database to repair configuration.

## 2. Enable account emails

1. Open Resend > Domains and add `getstayguide.com`, unless already verified.
2. At the domain's DNS provider, add the exact records Resend supplies. Preserve
   existing website and mailbox records. Wait for Resend to show Verified.
3. In Resend > API Keys, create a key with sending access to that domain.
4. In Vercel > StayGuide > Settings > Environment Variables, select Production
   and enter the following values (without wrapping quotation marks):

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | The private sending key from Resend |
| `EMAIL_FROM` | `StayGuide <hello@getstayguide.com>` |
| `NEXT_PUBLIC_APP_URL` | `https://www.getstayguide.com` |

If you verify a subdomain instead, the sender address must use that verified
subdomain. Resend sending-domain verification does not create a support inbox;
keep `hello@getstayguide.com` receiving mail through your mailbox provider.

Save the variables, then deploy the repaired production source. If it is already
deployed, use Deployments > the latest production deployment > Redeploy. Redeploying
an older source revision does not bring in the repairs. Environment changes only
apply to new deployments.

## 3. Check the other services

These settings may already be working; check them before changing anything.

| Feature | Required configuration |
| --- | --- |
| Persistent host data | Existing Neon `DATABASE_URL` and successful build migration |
| Password sign-in | `DATABASE_URL` and existing `AUTH_SECRET` |
| Google sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`; OAuth redirect URI `https://www.getstayguide.com/api/auth/callback/google` |
| AI answers | Existing configured provider; default Hugging Face uses `HF_TOKEN` with inference access |
| Stripe billing | `STRIPE_SECRET_KEY` and matching `STRIPE_WEBHOOK_SECRET` from the same Stripe mode |
| Host payouts | Stripe Connect enabled and the host's payout onboarding completed |

The Stripe webhook URL is `https://www.getstayguide.com/api/stripe/webhook`.
The setup script uses these events: `checkout.session.completed`,
`checkout.session.expired`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`, and
`invoice.payment_failed`. Inspect delivery results in Stripe. Do not rotate a
working webhook or run live charges merely to check environment variables.

## 4. Confirm the deployment works

1. Open `https://www.getstayguide.com/api/v1/status`. The repaired version includes
   an `email` entry. Its success means credentials are present, not that delivery
   has been tested. If the entry is absent, check the deployed source revision.
2. Open `/forgot-password`. The missing-email-configuration notice should be gone.
3. Create a new password account with an inbox you control. Receive and open its
   verification link, then sign in and sign out.
4. Request a password reset for that account, receive the link, set a new password,
   and confirm the new password works and the old one fails.
5. Confirm your existing Google account still signs in through Google. Existing
   Google accounts should not be registered again as password accounts.
6. Create and publish a test guide while signed in. Open its guest link in another
   browser, ask a guide question, and check host replies and extras requests.
7. Open `/integrations` and confirm the documentation page loads.
8. Verify billing in a separate Stripe test environment before testing live money
   movement. Health status alone cannot prove checkout, webhooks or payouts work.

If email fails, inspect Resend's delivery logs and Vercel runtime logs. Check sender
domain verification, API-key permissions and the Production environment selection.
Share error text with secrets removed when asking for help.

## Provider references

- [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction)
- [Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel redeployment](https://vercel.com/docs/deployments/managing-deployments)
