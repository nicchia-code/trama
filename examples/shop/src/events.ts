import type { Cents } from "./money";

export interface Line {
  product: string;
  quantity: number;
  unitPrice: Cents;
}

/** Every Event of the Model, named `owner.EVENT`, with what travels with it. `order` is the order number. */
export interface Events {
  "user.ADD_ITEM": { order: number; product: string; unitPrice: Cents };
  "user.CHECKOUT": { order: number };
  "user.CANCEL": { order: number };
  "cart.CONFIRM": { order: number; lines: Line[] };
  "order.CONFIRMED": { order: number; total: Cents };
  "order.REFUND_REQUESTED": { order: number };
  "payment.SUCCEEDED": { order: number };
  "payment.DECLINED": { order: number };
  "payment.REFUNDED": { order: number };
  "stripe.CHARGE_OK": { order: number; paymentId: string };
  "stripe.CHARGE_FAILED": { order: number };
  "stripe.REFUND_DONE": { order: number };
  "warehouse.PACKAGE_READY": { order: number };
  "courier.PICKED_UP": { order: number };
}

export type EventName = keyof Events;
type Handler<K extends EventName> = (payload: Events[K]) => void;

/** A synchronous bus: the machines talk to each other only through it. */
export class Hub {
  private readonly handlers = new Map<EventName, Array<Handler<EventName>>>();

  on<K extends EventName>(event: K, handler: Handler<K>): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler<EventName>);
    this.handlers.set(event, list);
  }

  emit<K extends EventName>(event: K, payload: Events[K]): void {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
}
