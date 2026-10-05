import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { articles } from "@/lib/articles";
export const metadata = { title: "The thoughtful host journal" };
export default function Page() {
  return (
    <div className="marketing">
      <MarketingNav />
      <main className="marketing-section center">
        <div className="eyebrow">THE STAYGUIDE JOURNAL</div>
        <h2>A little inspiration for better stays.</h2>
        <p>Practical ideas for hosts who care about the details.</p>
        <div className="feature-grid">
          {articles.map((a) => (
            <Link href={`/blog/${a.slug}`} className="card panel" key={a.slug}>
              <div className="eyebrow">{a.category}</div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 25,
                  fontWeight: 400,
                  lineHeight: 1.3,
                }}
              >
                {a.title}
              </h3>
              <p className="muted" style={{ fontSize: 13, margin: "15px 0" }}>
                {a.excerpt}
              </p>
              <span className="text-link">Read the story ↗</span>
            </Link>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
