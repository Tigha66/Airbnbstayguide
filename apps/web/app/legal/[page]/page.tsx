import { notFound } from "next/navigation";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
export function generateStaticParams() {
  return [{ page: "terms" }, { page: "privacy" }];
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!["terms", "privacy"].includes(page)) notFound();
  return (
    <div className="marketing">
      <MarketingNav />
      <article className="article">
        <div className="eyebrow">PREVIEW NOTICE · OCTOBER 2026</div>
        <h1>
          {page === "privacy"
            ? "Your privacy matters."
            : "A few clear expectations."}
        </h1>
        <div className="notice">
          Draft notice for StayGuide. Operator identity, legal contact,
          jurisdictions, retention schedule, refund/support policies, and final
          terms must be reviewed before broad public sale.
        </div>
        {page === "privacy" ? (
          <>
            <h2>Information in this preview</h2>
            <p>
              StayGuide can run as a browser-only demo or as a connected host
              workspace. In demo mode, guide edits and preferences are stored in
              your browser’s local storage. In connected mode, host accounts,
              guides, guest questions, extra requests, analytics, billing
              identifiers, and usage counters are stored in the production
              database.
            </p>
            <h2>Hosting and external services</h2>
            <p>
              Vercel hosts this site and may process request metadata. Vercel
              Analytics is included for aggregated website usage measurement.
              Property photographs can load from Unsplash. Opening map links
              takes you to Google Maps. Depending on configuration, StayGuide
              can also use Neon Postgres, Google sign-in, Hugging Face or other
              AI providers, Stripe, Resend, and monitoring services.
            </p>
            <h2>Offline guide storage</h2>
            <p>
              When you visit a guest guide, a service worker can save public
              guide pages and assets to your device for offline access. Remove
              the installed guide and clear browser site data to remove cached
              content.
            </p>
            <h2>Before launch</h2>
            <p>
              The production privacy policy must name the data controller,
              describe each processor and international transfer, establish
              retention and deletion procedures, and provide a verified contact
              for privacy requests.
            </p>
          </>
        ) : (
          <>
            <h2>Service status</h2>
            <p>
              StayGuide provides a browser demo and a connected web service when
              production environment variables are configured. Sample demo
              metrics, messages, and extras are fictional. Connected guides,
              billing, and paid extras depend on the host’s configured account
              and Stripe availability.
            </p>
            <h2>Your content</h2>
            <p>
              Only provide property descriptions, manuals, photographs, and
              recommendations you own or have permission to use. Hosts are
              responsible for checking the accuracy of their guides. AI
              suggestions require human review before publication.
            </p>
            <h2>Billing and extras</h2>
            <p>
              Displayed prices describe StayGuide subscription tiers. Stripe
              processes subscriptions and, where Stripe Connect is ready for the
              host, paid guest extras. Final cancellation rights, taxes, refund
              rules, payout responsibilities, and support processes require
              operator review before public sale.
            </p>
            <h2>Service limitations</h2>
            <p>
              This preview may change and is not a substitute for direct
              communication with a property host. Contact the relevant local
              emergency service in an emergency.
            </p>
          </>
        )}
      </article>
      <MarketingFooter />
    </div>
  );
}
