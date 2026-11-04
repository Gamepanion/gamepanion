import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { checkoutOverlay, pricingPlans, readOperatorPage, subscriptionOf } from "@/backend";
import { OperatorMarkdown } from "@/components/OperatorMarkdown";
import { Plans } from "@/components/Plans";
import { serverCopy, serverLocale } from "@/components/copy/server";
import { pagePlayer } from "../viewer";
import { portalAction } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).subscribeTitle };
}

// Subscribing (#48): the operator's words on pricing, then the plans as the provider holds them, yearly first. Only where something is
// sold. After paying, the provider sends the player back here, while its webhook makes them a subscriber.
export default async function SubscribePage({ searchParams }: PageProps<"/subscribe">) {
  const p = await pagePlayer();
  const sub = await subscriptionOf(p);
  if (!sub.sold) notFound();
  const copy = await serverCopy();
  const locale = await serverLocale();
  const words = await readOperatorPage("pricing", locale);
  const { plans, yearlySavingPercent, hostedAiSavingPercent } = await pricingPlans();
  const back = typeof (await searchParams).checkout_id === "string";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 pb-16">
      <h1 className="text-3xl">{copy.subscribeTitle}</h1>
      {words && (
        <div className="max-w-3xl">
          <OperatorMarkdown text={words} />
        </div>
      )}
      {sub.subscribed ? (
        <div className="card space-y-2">
          <p className="font-semibold">{sub.validUntil ? copy.subscribedUntil(date.format(sub.validUntil)) : copy.subscribed}</p>
          {sub.portal && (
            <form action={portalAction}>
              <button type="submit" className="button-secondary">
                {copy.managePlan}
              </button>
            </form>
          )}
        </div>
      ) : null}
      {/* A subscriber without the AI still sees the plans with it (#56); the others see every plan. */}
      {sub.subscribed && sub.hostedAi ? null : !sub.subscribed && back ? (
        <p role="status" className="card">
          {copy.confirming}{" "}
          <a href="/subscribe" className="font-semibold text-accent underline">
            {copy.reload}
          </a>
        </p>
      ) : plans.length === 0 ? (
        <p className="card">{copy.noPlans}</p>
      ) : (
        <Plans
          plans={plans
            .filter((x) => !sub.subscribed || x.tier === "hostedAi")
            .map((x) => ({
              period: x.period,
              tier: x.tier,
              price: new Intl.NumberFormat(locale, { style: "currency", currency: x.currency }).format(x.amount / 100),
            }))}
          saving={{ standard: yearlySavingPercent, hostedAi: hostedAiSavingPercent }}
          overlay={checkoutOverlay()}
          free={sub.subscribed ? null : new Intl.NumberFormat(locale, { style: "currency", currency: plans[0].currency, maximumFractionDigits: 0 }).format(0)}
        />
      )}
    </div>
  );
}
