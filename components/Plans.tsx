"use client";
// The plans on the subscribe page (#48, #56): the subscription, then the subscription with Gamepanion's AI, each yearly first with what it
// saves; each button goes to the provider's checkout.
import { useTransition } from "react";
import { checkoutAction } from "@/app/(app)/subscribe/actions";
import { useCopy } from "./copy/client";

type Tier = "standard" | "hostedAi";
type Shown = { period: "month" | "year"; tier: Tier; price: string };

export function Plans({ plans, saving }: { plans: Shown[]; saving: Record<Tier, number | null> }) {
  const copy = useCopy();
  const [pending, start] = useTransition();
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
                  <button type="button" className="button-primary" disabled={pending} onClick={() => start(() => checkoutAction(x.period, tier))}>
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
