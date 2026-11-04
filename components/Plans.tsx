"use client";
// The plans on the subscribe page (#48, #56): one card per plan, side by side on a wide screen: free (while the player is on it), the
// subscription, and the subscription with Gamepanion's AI. Each says what it gives, then its yearly price with the monthly one beside
// it, and ends in its two buttons, so the buttons line up across the cards. A button opens the provider's checkout, as an overlay on
// this page where the provider has one (Creem's embed, #107). The overlay is only the screen: the webhook alone makes the player a
// subscriber, and this page, reloaded with the checkout's id, says so.
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { checkoutAction } from "@/app/(app)/subscribe/actions";
import { useCopy, useLocale } from "./copy/client";

type Tier = "standard" | "hostedAi";
type Shown = { period: "month" | "year"; tier: Tier; price: string };

function Features({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((f) => (
        <li key={f} className="flex gap-2">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function Plans({
  plans,
  saving,
  overlay,
  free,
}: {
  plans: Shown[];
  saving: Record<Tier, number | null>;
  overlay: boolean;
  /** The free plan's price as the others are written (€0), while the player is on it; null when they subscribe. */
  free: string | null;
}) {
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
  const columns = tiers.length + (free ? 1 : 0);
  return (
    // The cards share their four rows (what it is, the price, what it gives, the buttons) through a subgrid, so each row lines up
    // across the cards however long a card's lead or list is.
    <ul className={`plans ${columns === 3 ? "lg:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "max-w-md"}`}>
      {free && (
        <li className="card plan">
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{copy.freeTitle}</h2>
            <p className="text-sm text-muted">{copy.freeLead}</p>
          </div>
          <p className="text-2xl font-bold">{free}</p>
          <Features items={copy.freeFeatures} />
          <p className="self-end text-sm font-semibold text-muted">{copy.yourPlan}</p>
        </li>
      )}
      {tiers.map((tier) => {
        const year = plans.find((x) => x.tier === tier && x.period === "year");
        const month = plans.find((x) => x.tier === tier && x.period === "month");
        const saved = year ? (saving[tier] ?? 0) : 0;
        return (
          <li key={tier} className={`card plan ${tier === "standard" ? "plan-marked" : ""}`} aria-labelledby={`tier-${tier}`}>
            <div className="space-y-1">
              <h2 id={`tier-${tier}`} className="text-xl font-bold">
                {tier === "standard" ? copy.subscriptionTitle : copy.hostedAiTitle}
              </h2>
              <p className="text-sm text-muted">{tier === "standard" ? copy.standardLead : copy.hostedAiLead}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{year ? copy.perYear(year.price) : month && copy.perMonth(month.price)}</p>
              {year && month && <p className="text-sm text-muted">{copy.orMonthly(month.price)}</p>}
              {saved > 0 && <p className="mt-1 text-sm font-semibold text-accent">{copy.saves(saved)}</p>}
            </div>
            <Features items={tier === "standard" ? copy.standardFeatures : copy.hostedAiFeatures} />
            <div className="flex flex-col gap-2 self-end pt-2">
              {year && (
                <button type="button" className="button-primary w-full" disabled={pending} onClick={() => checkout("year", tier)}>
                  {copy.subscribeYearly}
                </button>
              )}
              {month && (
                <button
                  type="button"
                  className={`${year ? "button-secondary" : "button-primary"} w-full`}
                  disabled={pending}
                  onClick={() => checkout("month", tier)}
                >
                  {copy.subscribeMonthly}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
