import type { Hub } from "./events";
import type { Cents } from "./money";

/** `Idle` is the absence of a record: a payment starts when its order is confirmed. */
export type PaymentState = "Charging" | "Paid" | "Declined" | "Refunding" | "Refunded";

/** Only the provider's payment ID is kept, never a card number (`requirements/data#payment`). */
export interface PaymentRecord {
  order: number;
  state: PaymentState;
  amount: Cents;
  paymentId: string | null;
}

/** What the payment machine asks Stripe to do; the answers come back as Stripe Events. */
export interface StripeGateway {
  charge(order: number, amount: Cents): void;
  refund(paymentId: string): void;
}

export class Payments {
  private readonly payments = new Map<number, PaymentRecord>();

  constructor(private readonly hub: Hub, private readonly stripe: StripeGateway) {
    hub.on("order.CONFIRMED", ({ order, total }) => this.charge(order, total));
    hub.on("stripe.CHARGE_OK", ({ order, paymentId }) => this.chargeOk(order, paymentId));
    hub.on("stripe.CHARGE_FAILED", ({ order }) => this.chargeFailed(order));
    hub.on("order.REFUND_REQUESTED", ({ order }) => this.refund(order));
    hub.on("stripe.REFUND_DONE", ({ order }) => this.refundDone(order));
  }

  get(order: number): PaymentRecord | undefined {
    return this.payments.get(order);
  }

  private charge(order: number, amount: Cents): void {
    if (this.payments.has(order)) return;
    this.payments.set(order, { order, state: "Charging", amount, paymentId: null });
    this.stripe.charge(order, amount);
  }

  private chargeOk(order: number, paymentId: string): void {
    const payment = this.payments.get(order);
    if (payment === undefined || payment.state !== "Charging") return;
    payment.state = "Paid";
    payment.paymentId = paymentId;
    this.hub.emit("payment.SUCCEEDED", { order });
  }

  private chargeFailed(order: number): void {
    const payment = this.payments.get(order);
    if (payment === undefined || payment.state !== "Charging") return;
    payment.state = "Declined";
    this.hub.emit("payment.DECLINED", { order });
  }

  private refund(order: number): void {
    const payment = this.payments.get(order);
    if (payment === undefined || payment.state !== "Paid" || payment.paymentId === null) return;
    payment.state = "Refunding";
    this.stripe.refund(payment.paymentId);
  }

  private refundDone(order: number): void {
    const payment = this.payments.get(order);
    if (payment === undefined || payment.state !== "Refunding") return;
    payment.state = "Refunded";
    this.hub.emit("payment.REFUNDED", { order });
  }
}
