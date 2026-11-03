"use server";
// The subscribe and account pages' writes (#48): to the provider's checkout or portal, and the game a free player keeps active.
import { redirect } from "next/navigation";
import { chooseActiveGame, portalFor, startCheckout } from "@/backend";
import { pagePlayer } from "../viewer";

export async function checkoutAction(period: "month" | "year"): Promise<void> {
  const { url } = await startCheckout(await pagePlayer(), period);
  redirect(url);
}

export async function portalAction(): Promise<void> {
  const url = await portalFor(await pagePlayer());
  redirect(url ?? "/account");
}

export async function chooseActiveGameAction(gameId: string): Promise<void> {
  await chooseActiveGame(await pagePlayer(), gameId);
}
