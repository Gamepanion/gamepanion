"use client";
// The plans on the subscribe page (#48, #56). A switch between monthly and yearly billing first (monthly chosen), then one card per
// plan side by side: free (while the player is on it), the subscription, and the subscription with Gamepanion's AI. Every card lists
// the same benefits in the same order, ticked where the plan has them and struck through where it doesn't, so each plan reads as the
// one before with more ticked. The cards share their rows through a subgrid (what it is, the price, the list, the button), so the
// rows line up. A button opens the provider's checkout, as an overlay on this page where the provider has one (Creem's embed, #107).
// The overlay is only the screen: the webhook alone makes the player a subscriber, and this page, reloaded with the checkout's id,
// says so.
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { checkoutAction } from "@/app/(app)/subscribe/actions";
import { useCopy, useLocale } from "./copy/client";

type Tier = "standard" | "hostedAi";
type Period = "month" | "year";
type Shown = { period: Period; tier: Tier; price: string };
const RANK = { free: 0, standard: 1, hostedAi: 2 } as const;

function Benefits({ plan }: { plan: keyof typeof RANK }) {
  const copy = useCopy();
  return (
    <ul className="space-y-2 text-sm">
      {copy.planFeatures.map((f) =>
        RANK[f.from] <= RANK[plan] ? (
          <li key={f.text} className="flex gap-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>{f.text}</span>
          </li>
        ) : (
          <li key={f.text} className="flex gap-2 text-muted">
            <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="line-through">
              <span className="sr-only">{copy.notIncluded}: </span>
              {f.text}
            </span>
          </li>
        ),
      )}
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
  const name = useId();
  const [pending, start] = useTransition();
  const periods = (["month", "year"] as const).filter((p) => plans.some((x) => x.period === p));
  const [period, setPeriod] = useState<Period>(periods[0] ?? "month");
  const checkout = (p: Period, tier: Tier) =>
    start(async () => {
      const url = await checkoutAction(p, tier);
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
    <div className="space-y-5">
      {periods.length > 1 && (
        <fieldset className="dial w-full max-w-sm">
          <legend className="sr-only">{copy.billing}</legend>
          <div className="dial-levels">
            {periods.map((p) => (
              <label key={p}>
                <input type="radio" name={name} value={p} checked={period === p} onChange={() => setPeriod(p)} />
                <span>{p === "month" ? copy.monthly : copy.yearly}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <ul className={`plans ${columns === 3 ? "lg:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "max-w-md"}`}>
        {free && (
          <li className="card plan">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{copy.freeTitle}</h2>
              <p className="text-sm text-muted">{copy.freeLead}</p>
            </div>
            <p>
              <span className="text-2xl font-bold">{free}</span>
            </p>
            <Benefits plan="free" />
            <p className="self-end text-sm font-semibold text-muted">{copy.yourPlan}</p>
          </li>
        )}
        {tiers.map((tier) => {
          // The chosen period's price; a plan sold in the other period only shows that one.
          const shown = plans.find((x) => x.tier === tier && x.period === period) ?? plans.find((x) => x.tier === tier)!;
          const saved = shown.period === "year" ? (saving[tier] ?? 0) : 0;
          return (
            <li key={tier} className={`card plan ${tier === "standard" ? "plan-marked" : ""}`} aria-labelledby={`tier-${tier}`}>
              <div className="space-y-1">
                <h2 id={`tier-${tier}`} className="text-xl font-bold">
                  {tier === "standard" ? copy.subscriptionTitle : copy.hostedAiTitle}
                </h2>
                <p className="text-sm text-muted">{tier === "standard" ? copy.standardLead : copy.hostedAiLead}</p>
              </div>
              <p>
                <span className="text-2xl font-bold">{shown.price}</span>{" "}
                <span className="text-muted">{shown.period === "year" ? copy.perYearShort : copy.perMonthShort}</span>
                {saved > 0 && <span className="ml-2 text-sm font-semibold text-accent">{copy.savesShort(saved)}</span>}
              </p>
              <Benefits plan={tier} />
              <div className="space-y-2 self-end pt-2">
                <button type="button" className="button-primary w-full" disabled={pending} onClick={() => checkout(shown.period, tier)}>
                  {copy.subscribeNow}
                </button>
                <p className="text-xs text-muted">{tier === "hostedAi" ? copy.allowanceNote : copy.cancelNote}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
