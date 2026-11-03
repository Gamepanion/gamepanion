"use client";
// The plans on the subscribe page (#48), yearly first with what it saves; each button goes to the provider's checkout.
import { useTransition } from "react";
import { checkoutAction } from "@/app/(app)/subscribe/actions";
import { useCopy } from "./copy/client";

export function Plans({ plans, saving }: { plans: { period: "month" | "year"; price: string }[]; saving: number | null }) {
  const copy = useCopy();
  const [pending, start] = useTransition();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {plans.map((x) => (
        <li key={x.period} className={`card space-y-3 ${x.period === "year" ? "continue-card" : ""}`}>
          <p className="text-2xl font-bold">{x.period === "year" ? copy.perYear(x.price) : copy.perMonth(x.price)}</p>
          {x.period === "year" && saving !== null && saving > 0 && <p className="font-semibold text-accent">{copy.saves(saving)}</p>}
          <button type="button" className="button-primary" disabled={pending} onClick={() => start(() => checkoutAction(x.period))}>
            {x.period === "year" ? copy.subscribeYearly : copy.subscribeMonthly}
          </button>
        </li>
      ))}
    </ul>
  );
}
