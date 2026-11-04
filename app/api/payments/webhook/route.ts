import { Webhook } from "@creem_io/nextjs";
import type { NextRequest } from "next/server";
import { creemWebhook, paymentsWebhookRoute } from "@/backend";

// The payment provider's webhook (#48): signed, idempotent, turned into the billing store's rows. 404 where nothing is sold. Creem's (#107)
// goes through its official Next.js handler, which checks the signature and calls the backend's callback for each kind of delivery; the
// fake provider's through the backend alone.
export async function POST(req: NextRequest): Promise<Response> {
  const creem = creemWebhook();
  return creem ? Webhook(creem)(req) : paymentsWebhookRoute(req);
}
