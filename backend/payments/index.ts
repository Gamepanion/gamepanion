// The provider this instance uses, from GAMEPANION_PAYMENT_PROVIDER; null while none is set: then nothing is sold and nothing is limited
// (V7). Nothing in backend/payments/ knows about games.
import { config } from "../config";
import { createCreem } from "./creem-api";
import { createFake } from "./fake";
import type { PaymentProvider } from "./types";

export type { PaymentEvent, PaymentProvider, Period, Plan, Tier } from "./types";
export { WebhookRejectedError } from "./types";
export { fakeCancelled, fakeSignature } from "./fake";
export { creemDeliveries } from "./creem-deliveries";
export { soldProducts } from "./creem-api";

export function paymentProvider(): PaymentProvider | null {
  switch (config.paymentProvider()) {
    case "":
      return null;
    case "fake":
      return createFake(config.fakeWebhookSecret());
    case "creem":
      return createCreem(config.creem());
  }
}
