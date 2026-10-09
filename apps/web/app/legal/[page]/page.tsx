import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { LEGAL_UPDATED, privacyPolicy, termsOfService } from "@/lib/legal";

const pages = { privacy: privacyPolicy, terms: termsOfService };
export function generateStaticParams() {
  return [{ page: "terms" }, { page: "privacy" }];
}
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return page === "privacy"
    ? { title: "Privacy policy", description: "How StayGuide collects, uses and protects personal data." }
    : { title: "Terms of service", description: "The terms for using StayGuide." };
}
export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (page !== "privacy" && page !== "terms") notFound();
  const content = pages[page]();
  return (
    <div className="marketing">
      <MarketingNav />
      <article className="article">
        <div className="eyebrow">LAST UPDATED · {LEGAL_UPDATED.toUpperCase()}</div>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </article>
      <MarketingFooter />
    </div>
  );
}
