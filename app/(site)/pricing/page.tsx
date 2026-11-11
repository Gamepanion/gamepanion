import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pricingPlans, readOperatorPage, sells } from "@/backend";
import { Footer } from "@/components/Footer";
import { OperatorMarkdown } from "@/components/OperatorMarkdown";
import { Plans } from "@/components/Plans";
import { Wordmark } from "@/components/Wordmark";
import { serverCopy, serverLocale } from "@/components/copy/server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).pricing };
}

// What it costs, for anyone (no sign-in): the operator's words on pricing, then the free plan and the plans as the provider holds
// them, as on the subscribe page. Only where something is sold. Nothing is bought here: a plan's button leads through the sign-in
// to the subscribe page, where the checkout knows the player.
export default async function PricingPage() {
  if (!sells()) notFound();
  const copy = await serverCopy();
  const locale = await serverLocale();
  const words = await readOperatorPage("pricing", locale);
  const { plans, yearlySavingPercent, hostedAiSavingPercent } = await pricingPlans();
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" aria-label={copy.appName}>
          <Wordmark />
        </Link>
        <Link href="/login" className="font-semibold text-accent underline">
          {copy.signIn}
        </Link>
      </div>
      <div className="mt-6 space-y-6">
        <h1 className="text-3xl">{copy.pricing}</h1>
        {words && (
          <div className="max-w-3xl">
            <OperatorMarkdown text={words} />
          </div>
        )}
        {plans.length === 0 ? (
          <p className="card">{copy.noPlans}</p>
        ) : (
          <Plans
            plans={plans.map((x) => ({
              period: x.period,
              tier: x.tier,
              price: new Intl.NumberFormat(locale, { style: "currency", currency: x.currency }).format(x.amount / 100),
            }))}
            saving={{ standard: yearlySavingPercent, hostedAi: hostedAiSavingPercent }}
            overlay={false}
            free={new Intl.NumberFormat(locale, { style: "currency", currency: plans[0].currency, maximumFractionDigits: 0 }).format(0)}
            signedOut
          />
        )}
      </div>
      <Footer />
    </main>
  );
}
