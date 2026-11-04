"use server";
// The subscribe and account pages' writes (#48): to the provider's checkout or portal, and the game a free player keeps active.
import { redirect } from "next/navigation";
import { chooseActiveGame, portalFor, startCheckout } from "@/backend";
import { pagePlayer } from "../viewer";

/** The checkout's URL: the page opens it as an overlay (Creem's embed, #107) or goes there. */
export async function checkoutAction(period: "month" | "year", tier: "standard" | "hostedAi" = "standard"): Promise<string> {
  return (await startCheckout(await pagePlayer(), period, tier)).url;
}

export async function portalAction(): Promise<void> {
  const url = await portalFor(await pagePlayer());
  redirect(url ?? "/account");
}

export async function chooseActiveGameAction(gameId: string): Promise<void> {
  await chooseActiveGame(await pagePlayer(), gameId);
}
