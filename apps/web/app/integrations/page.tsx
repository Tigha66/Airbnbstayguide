import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing";
import {
  integrationCategories,
  integrationDisclaimer,
  integrationPlaybooks,
  integrationStats,
  integrationStatusTone,
} from "@/lib/integrations";

export const metadata: Metadata = {
  title: "StayGuide integrations",
  description:
    "Documented StayGuide setup paths for Airbnb, Booking.com, Vrbo, direct bookings, PMS tools, messaging, payments and automation.",
  alternates: { canonical: "/integrations" },
  openGraph: {
    title: "StayGuide integrations",
    description:
      "A practical integration directory for hosts and independent property managers using StayGuide with their existing booking stack.",
    type: "website",
  },
};

export default function Page() {
  return (
    <div className="marketing">
      <MarketingNav locale="en" />
      <main>
        <section className="integrations-hero">
          <div>
            <div className="eyebrow">INTEGRATION DIRECTORY</div>
            <h1>StayGuide works with the stack hosts already use.</h1>
            <p>
              A single guest guide can travel through booking channels, PMS message templates, WhatsApp, email,
              QR cards and direct-booking flows. This page documents what works today, what we help configure,
              and what is planned for native automation.
            </p>
            <div className="row">
              <Link className="button" href="/dashboard">
                Build a guide
                <ArrowRight size={16} />
              </Link>
              <a className="button secondary" href="mailto:hello@getstayguide.com?subject=StayGuide integration onboarding">
                Ask about onboarding
              </a>
            </div>
          </div>
          <div className="integrations-panel" aria-label="Integration coverage summary">
            {integrationStats.map((stat) => (
              <div key={stat.label} className="integration-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
            <p>{integrationDisclaimer}</p>
          </div>
        </section>

        <section className="marketing-section integrations-section">
          <div className="eyebrow">COVERAGE</div>
          <h2>Documented breadth, clearly labeled.</h2>
          <p>
            Competitors often publish long integration lists. StayGuide now gives hosts the same kind of
            buying clarity: live capabilities, documented setup guides, onboarding-supported PMS workflows
            and the native integrations roadmap.
          </p>
          <div className="integration-category-grid">
            {integrationCategories.map((category) => {
              const Icon = category.icon;
              return (
                <article className="integration-category" key={category.title}>
                  <div className="integration-category-heading">
                    <span className="stat-icon">
                      <Icon size={18} />
                    </span>
                    <div>
                      <div className="eyebrow">{category.eyebrow}</div>
                      <h3>{category.title}</h3>
                    </div>
                  </div>
                  <p>{category.description}</p>
                  <div className="integration-list">
                    {category.integrations.map((integration) => (
                      <div className="integration-item" key={integration.name}>
                        <div>
                          <strong>{integration.name}</strong>
                          <span className={`integration-status ${integrationStatusTone[integration.status]}`}>
                            {integration.status}
                          </span>
                        </div>
                        <p>{integration.summary}</p>
                        <small>{integration.setup}</small>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-band">
          <div className="marketing-section integrations-section">
            <div className="eyebrow">ROLLOUT PLAYBOOKS</div>
            <h2>From first guide to portfolio rollout.</h2>
            <div className="integration-playbook-grid">
              {integrationPlaybooks.map((playbook) => {
                const Icon = playbook.icon;
                return (
                  <article className="feature-card integration-playbook" key={playbook.title}>
                    <span className="stat-icon">
                      <Icon size={18} />
                    </span>
                    <h3>{playbook.title}</h3>
                    <ul>
                      {playbook.steps.map((step) => (
                        <li key={step}>
                          <CheckCircle2 size={15} />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="marketing-cta">
            <h2>Need a specific PMS or channel?</h2>
            <p>
              Tell us your booking stack. We will map where StayGuide fits today and use that demand to
              prioritize native integrations next.
            </p>
            <a className="button cream" href="mailto:hello@getstayguide.com?subject=StayGuide integration request">
              Request an integration
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter locale="en" />
    </div>
  );
}

