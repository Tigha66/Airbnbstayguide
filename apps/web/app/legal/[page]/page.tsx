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
        <div className="eyebrow">STAYGUIDE · OCTOBER 2026</div>
        <h1>
          {page === "privacy"
            ? "Your privacy matters."
            : "A few clear expectations."}
        </h1>
        {page === "privacy" ? (
          <>
            <h2>Who operates StayGuide</h2>
            <p>
              StayGuide is available at{" "}
              <a href="https://www.getstayguide.com">www.getstayguide.com</a>.
              For privacy, support, billing, or legal questions, contact{" "}
              <a href="mailto:hello@getstayguide.com">
                hello@getstayguide.com
              </a>
              .
            </p>
            <h2>Information we process</h2>
            <p>
              Hosts may provide account details, workspace preferences, property
              descriptions, guide content, photos, guest recommendations, extras
              and billing information. Guests may use public guide links, ask
              concierge questions, request paid extras, and provide contact
              details when they choose to contact a host or request a service.
            </p>
            <h2>Hosting and external services</h2>
            <p>
              StayGuide uses trusted service providers to run the product:
              Vercel for hosting and analytics, Neon Postgres for application
              data, Google and Apple for optional sign-in, Resend for account
              email when configured, Stripe for subscriptions, paid extras and
              payouts, and AI providers to organize guide content and answer
              guest questions from the host’s guide.
            </p>
            <h2>Offline guide storage</h2>
            <p>
              When you visit a guest guide, a service worker can save public
              guide pages and assets to your device for offline access. Remove
              the installed guide and clear browser site data to remove cached
              content.
            </p>
            <h2>Retention and control</h2>
            <p>
              Hosts can update or delete their guide content from the
              dashboard. Account deletion removes the host account and related
              properties, chats and requests from the application database,
              subject to records that must be retained for security, billing,
              tax, fraud prevention or legal compliance. For privacy requests
              including access, correction or deletion, contact{" "}
              <a href="mailto:hello@getstayguide.com">
                hello@getstayguide.com
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <h2>The service</h2>
            <p>
              StayGuide helps hosts create digital guest guides, share them
              with guests, answer guide-based questions with AI assistance, and
              offer optional paid extras. Guests do not need a StayGuide account
              to open a public guide link.
            </p>
            <h2>Your content</h2>
            <p>
              Only provide property descriptions, manuals, photographs, and
              recommendations you own or have permission to use. Hosts are
              responsible for checking the accuracy of their guides. AI
              suggestions require human review before publication.
            </p>
            <h2>Billing, subscriptions and extras</h2>
            <p>
              Paid plans and extras are processed by Stripe. Subscription
              prices, included usage and plan limits are shown on the pricing
              page and in the dashboard before checkout. Hosts are responsible
              for fulfilling extras they publish, handling guest communication,
              and complying with taxes, local regulations and refund
              obligations that apply to their properties and services.
            </p>
            <h2>Service limitations</h2>
            <p>
              AI answers are generated from the guide content and may be
              incomplete or unavailable. Hosts must review guide information,
              especially access details, prices, phone numbers and emergency
              instructions. StayGuide is not a substitute for direct host
              communication or emergency services.
            </p>
            <h2>Contact</h2>
            <p>
              For legal questions about these terms, reach us at{" "}
              <a href="mailto:hello@getstayguide.com">
                hello@getstayguide.com
              </a>
              .
            </p>
          </>
        )}
      </article>
      <MarketingFooter />
    </div>
  );
}
