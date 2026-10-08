import { HomePage } from "@/components/home-page";
import { siteMetadata } from "@/lib/site-metadata";

export const metadata = siteMetadata("en", "");
export default function Page() {
  return <HomePage locale="en" />;
}
