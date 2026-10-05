import { MarketingNav, MarketingFooter, Pricing } from "@/components/marketing";
export const metadata = { title: "Simple per-property pricing" };
export default function Page() {
  return (
    <div className="marketing">
      <MarketingNav />
      <main className="marketing-section center">
        <div className="eyebrow">A LITTLE INVESTMENT IN A BETTER STAY</div>
        <h2>Simple plans. Thoughtful hospitality.</h2>
        <p>Start small. Make it yours. Grow when you’re ready.</p>
        <Pricing />
      </main>
      <MarketingFooter />
    </div>
  );
}
