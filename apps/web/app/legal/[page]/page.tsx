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
          Draft notice for the StayGuide demonstration. Operator identity, legal
          contact, jurisdictions, retention schedule, and final terms must be
          supplied before accepting real customers.
        </div>
        {page === "privacy" ? (
          <>
            <h2>Information in this preview</h2>
            <p>
              The demo workspace stores guide edits and preferences in your
              browser’s local storage. Do not enter real guest personal
              information, private door codes, or confidential documents. Clear
              site data in your browser to remove your local demo information.
            </p>
            <h2>Hosting and external services</h2>
            <p>
              Vercel hosts this site and may process request metadata. Vercel
              Analytics is included for aggregated website usage measurement.
              Property photographs load from Unsplash. Opening map links takes
              you to Google Maps. Live Supabase, Stripe, email, and AI
              processing are not enabled without configuration.
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
            <h2>Demonstration service</h2>
            <p>
              StayGuide currently provides a product preview. Sample metrics,
              messages, and extras are fictional. Demo checkout does not charge
              a card or reserve a service. Do not rely on the sample concierge
              for emergency assistance or real property access.
            </p>
            <h2>Your content</h2>
            <p>
              Only provide property descriptions, manuals, photographs, and
              recommendations you own or have permission to use. Hosts are
              responsible for checking the accuracy of their guides. AI
              suggestions require human review before publication.
            </p>
            <h2>Planned billing</h2>
            <p>
              Displayed prices describe planned subscription tiers. Final
              billing terms, cancellation rights, applicable taxes, refund
              policies, and extras fulfillment responsibilities must be
              established before paid subscriptions are activated.
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
