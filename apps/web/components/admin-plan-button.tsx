"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Owner-only control on /admin: switch an account to the Hotel & Multi-Unit plan or back to Free. */
export function AdminPlanButton({ email, plan, hasSubscription }: { email: string; plan: string; hasSubscription: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (hasSubscription) return <small className="muted">Stripe</small>;
  const target = plan === "hotel" ? "free" : "hotel";
  return (
    <button
      className="button secondary small"
      disabled={busy}
      onClick={async () => {
        const label = target === "hotel" ? "activate the Hotel & Multi-Unit plan for" : "move back to Free";
        if (!confirm(`Do you want to ${label} ${email}?`)) return;
        setBusy(true);
        const res = await fetch("/api/v1/admin/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, plan: target }),
        });
        const body = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) alert(body.error || "Could not change the plan.");
        router.refresh();
      }}
    >
      {busy ? "Saving…" : target === "hotel" ? "Make Hotel" : "Remove Hotel"}
    </button>
  );
}
