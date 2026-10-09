import { MarketingFooter, MarketingNav } from "@/components/marketing";
import { TryGuide } from "@/components/try-guide";

export const metadata = {
  title: "Try StayGuide — Build your guest guide in 60 seconds",
  description: "Paste your house manual or listing URL and preview an AI-built StayGuide guest guide before signing in.",
};

export default function Page() {
  return (
    <div className="marketing">
      <MarketingNav locale="en" />
      <main>
        <TryGuide />
      </main>
      <MarketingFooter locale="en" />
    </div>
  );
}
