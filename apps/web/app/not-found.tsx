import Link from "next/link";
import { Logo } from "@/components/ui";
export default function NotFound() {
  return (
    <main
      className="empty"
      style={{ minHeight: "85vh", alignContent: "center" }}
    >
      <Logo />
      <h1>A little off the beaten path.</h1>
      <p>We couldn’t find that page. Let’s get you somewhere lovely.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </main>
  );
}
