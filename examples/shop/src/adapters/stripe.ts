import type { Hub } from "../events";

/** The few fields of Stripe's webhook calls the shop reads; `metadata.order` is set when the charge is created. */
export interface StripeWebhook {
  type: "charge.succeeded" | "charge.failed" | "charge.refunded";
  id: string;
  metadata: { order: string };
}

/** Turns what Stripe reports into the Events of the Stripe Actor. Unknown order numbers are ignored by the machines. */
export function handleStripeWebhook(hub: Hub, webhook: StripeWebhook): void {
  const order = Number(webhook.metadata.order);
  if (!Number.isInteger(order)) return;
  switch (webhook.type) {
    case "charge.succeeded":
      hub.emit("stripe.CHARGE_OK", { order, paymentId: webhook.id });
      break;
    case "charge.failed":
      hub.emit("stripe.CHARGE_FAILED", { order });
      break;
    case "charge.refunded":
      hub.emit("stripe.REFUND_DONE", { order });
      break;
  }
}
