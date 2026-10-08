import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import {
  MarketingNav,
  MarketingFooter,
  Pricing,
  RoiCalculator,
} from "@/components/marketing";
import { demoProperties } from "@stayguide/shared";
export default function Page() {
  return (
    <div className="marketing">
      <MarketingNav />
      <main>
        <section className="marketing-hero">
          <div>
            <div className="eyebrow">A WARMER WELCOME. A LIGHTER WORKLOAD.</div>
            <h1>
              Less managing.
              <br />
              More <em>hosting.</em>
            </h1>
            <p>
              All the little details that make a great stay, in one beautiful
              guest guide. With a helpful concierge that’s always there.
            </p>
            <div className="row">
              <Link className="button" href="/dashboard">
                Create a better welcome
                <ArrowRight size={16} />
              </Link>
              <Link className="button secondary" href="/demo">
                Meet the guest guide
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <small>
              <ShieldCheck
                size={13}
                style={{ display: "inline", marginRight: 5 }}
              />
              Explore the demo. No credit card, no commitment.
            </small>
          </div>
          <div className="marketing-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={demoProperties[0].image}
              alt="A sunlit holiday villa surrounded by greenery"
              fetchPriority="high"
            />
            <div className="marketing-overlay">
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  YOUR HOME AWAY FROM HOME
                </div>
                <h3>Olá, welcome to Casa Serena.</h3>
                <p>One beautiful place. Every little detail.</p>
              </div>
              <Link
                href="/demo"
                className="icon-button"
                aria-label="Explore Casa Serena guest guide"
              >
                <ArrowUpRight size={19} />
              </Link>
            </div>
          </div>
        </section>
        <div className="marketing-band">
          <section className="marketing-section center" id="how-it-works">
            <div className="eyebrow">
              A LITTLE SETUP. A LOT LESS REPEATING YOURSELF.
            </div>
            <h2>
              Great hospitality starts
              <br />
              before the door opens.
            </h2>
            <p>
              Less “What’s the Wi-Fi?” More “What a lovely stay.” Give every
              guest a welcome that feels personal.
            </p>
            <div className="feature-grid">
              {[
                [
                  "01",
                  "Make it yours",
                  "Add your property and the details you already know by heart. Turn your house manual into a guide guests actually want to read.",
                ],
                [
                  "02",
                  "Share a warm welcome",
                  "One link in a message. One QR card on the table. No app download or guest login standing between them and a great stay.",
                ],
                [
                  "03",
                  "Let the little things run",
                  "A guide-based concierge for everyday questions, thoughtful extras for better stays, and you when a human touch matters.",
                ],
              ].map(([number, title, copy]) => (
                <div className="feature-card" key={number}>
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="marketing-section">
          <RoiCalculator />
        </section>
        <section className="marketing-section center">
          <div className="eyebrow">ROOM TO GROW</div>
          <h2>Your properties. Your pace.</h2>
          <p>
            From your first little hideaway to a whole collection of memorable
            places.
          </p>
          <Pricing />
        </section>
        <section className="marketing-section center">
          <div className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</div>
          <h2>Good questions. Simple answers.</h2>
          <div className="faq">
            {[
              [
                "Do guests need to download an app?",
                "No. Guests open their guide in a browser from a link or QR code. They can also save it to their home screen for easy access.",
              ],
              [
                "What does the AI concierge know?",
                "Only what’s in your guide. It answers 24/7 in the guest’s own language and shows which section it used. If the answer isn’t in your guide, it never guesses: it tells the guest it has passed the question to you, and it appears in your Guest inbox.",
              ],
              [
                "Can I use my existing house manual?",
                "Yes. Paste your existing house manual when you add a property, and our AI organizes it into clear sections (arrival, Wi-Fi, house rules, checkout and more) using only what you wrote. You can edit everything afterwards.",
              ],
              [
                "How do extras payments work?",
                "Guests pay securely by card, Apple Pay or Google Pay through Stripe. The money goes to your own Stripe account, minus a 5% platform fee. For extras that need your approval, the guest is only charged once you accept.",
              ],
              [
                "Which languages can guests use?",
                "Guests can read their guide in English, French, Spanish or Arabic, translated automatically from what you wrote, and the concierge answers in 12 languages. Door codes, Wi-Fi passwords and times are never changed by translation.",
              ],
              [
                "Is StayGuide available now?",
                "Yes. Sign in with Google, create your first guide free, and upgrade when you’re ready. Running a hotel, resort or many units? Talk to us about the Hotel & Multi-Unit plan.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="marketing-section">
          <div className="marketing-cta">
            <Leaf size={30} style={{ margin: "0 auto 20px" }} />
            <h2>
              A great stay starts with you.
              <br />
              We’ll handle the little details.
            </h2>
            <p>Make room for the parts of hosting you love.</p>
            <Link href="/dashboard" className="button cream">
              Step inside StayGuide
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "StayGuide",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Digital guest guidebooks for thoughtful short-term rental hosts.",
            url: "https://stayguide.app",
          }),
        }}
      />
    </div>
  );
}
