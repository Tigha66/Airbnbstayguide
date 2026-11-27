import { HomePage } from "@/components/home-page";
import { siteMetadata } from "@/lib/site-metadata";
import { signupConfigured } from "@/auth";

export const metadata = siteMetadata("en", "");
export default function Page() {
  return <HomePage locale="en" registrationAvailable={signupConfigured()} />;
}
