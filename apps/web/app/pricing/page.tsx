import { PricingPage } from "@/components/home-page";
import { siteMetadata } from "@/lib/site-metadata";

export const metadata = siteMetadata("en", "/pricing");
export default function Page() {
  return <PricingPage locale="en" />;
}
