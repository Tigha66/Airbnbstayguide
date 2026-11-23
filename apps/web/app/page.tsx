import { HomePage } from "@/components/home-page";
import { siteMetadata } from "@/lib/site-metadata";
import { authConfigured } from "@/auth";

export const metadata = siteMetadata("en", "");
export default function Page() {
  return <HomePage locale="en" registrationAvailable={authConfigured()} />;
}
