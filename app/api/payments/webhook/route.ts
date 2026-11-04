import { paymentsWebhookRoute } from "@/backend";

// The payment provider's webhook (#48): signed, idempotent, turned into the billing store's rows. 404 where nothing is sold.
export const POST = paymentsWebhookRoute;
