"use client";
// The plans on the subscribe page (#48, #56): the subscription, then the subscription with Gamepanion's AI, each yearly first with what it
// saves; each button opens the provider's checkout, as an overlay on this page where the provider has one (Creem's embed, #107). The
// overlay is only the screen: the webhook alone makes the player a subscriber, and this page, reloaded with the checkout's id, says so.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { checkoutAction } from "@/app/(app)/subscribe/actions";
import { useCopy, useLocale } from "./copy/client";

type Tier = "standard" | "hostedAi";
type Shown = { period: "month" | "year"; tier: Tier; price: string };

export function Plans({ plans, saving, overlay }: { plans: Shown[]; saving: Record<Tier, number | null>; overlay: boolean }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const checkout = (period: Shown["period"], tier: Tier) =>
    start(async () => {
      const url = await checkoutAction(period, tier);
      if (!overlay) return window.location.assign(url);
      const { openCheckout } = await import("@creem_io/embed");
      openCheckout({
        checkoutUrl: url,
        locale,
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
        // With a success URL the embed goes there itself; otherwise this page, with the checkout's id, waits for the webhook.
        onComplete: (d) => d.redirect || router.push(`/subscribe?checkout_id=${encodeURIComponent(d.checkoutId)}`),
      });
    });
  const tiers = (["standard", "hostedAi"] as const).filter((t) => plans.some((x) => x.tier === t));
  return (
    <div className="space-y-8">
      {tiers.map((tier) => (
        <section key={tier} aria-labelledby={`tier-${tier}`} className="space-y-3">
          <h2 id={`tier-${tier}`} className="text-xl font-bold">
            {tier === "standard" ? copy.subscribeTitle : copy.hostedAiTitle}
          </h2>
          <p className="text-sm text-muted">{tier === "standard" ? copy.standardLead : copy.hostedAiLead}</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {plans
              .filter((x) => x.tier === tier)
              .map((x) => (
                <li key={x.period} className={`card space-y-3 ${x.period === "year" ? "continue-card" : ""}`}>
                  <p className="text-2xl font-bold">{x.period === "year" ? copy.perYear(x.price) : copy.perMonth(x.price)}</p>
                  {x.period === "year" && (saving[tier] ?? 0) > 0 && <p className="font-semibold text-accent">{copy.saves(saving[tier]!)}</p>}
                  <button type="button" className="button-primary" disabled={pending} onClick={() => checkout(x.period, tier)}>
                    {x.period === "year" ? copy.subscribeYearly : copy.subscribeMonthly}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
