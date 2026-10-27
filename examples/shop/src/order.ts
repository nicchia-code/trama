import type { Hub, Line } from "./events";
import { lineTotal } from "./cart";
import type { Cents } from "./money";

/** A State inside Paid is written `Paid/<sub-state>`. */
export type OrderState =
  | "Draft"
  | "Awaiting payment"
  | "Paid/Preparing"
  | "Paid/Ready to ship"
  | "Refunding"
  | "Shipped"
  | "Cancelled";

/** What an order holds (`requirements/data#order`): totals are cents. */
export interface OrderRecord {
  number: number;
  /** The customer's email address. */
  customer: string;
  address: string | null;
  lines: Line[];
  total: Cents;
  state: OrderState;
  /** True once the warehouse has begun packing; a cancellation then goes through a refund. */
  packingStarted: boolean;
}

/** What the order asks of the outside world when it enters a State. */
export interface OrderPorts {
  requestPacking(order: OrderRecord): void;
  requestPickup(order: OrderRecord): void;
}

export class Orders {
  private readonly orders = new Map<number, OrderRecord>();

  constructor(private readonly hub: Hub, private readonly ports: OrderPorts) {
    hub.on("cart.CONFIRM", ({ order, lines }) => this.confirm(order, lines));
    hub.on("payment.SUCCEEDED", ({ order }) => this.paid(order));
    hub.on("payment.DECLINED", ({ order }) => this.declined(order));
    hub.on("user.CANCEL", ({ order }) => this.cancel(order));
    hub.on("payment.REFUNDED", ({ order }) => this.refunded(order));
    hub.on("warehouse.PACKAGE_READY", ({ order }) => this.packed(order));
    hub.on("courier.PICKED_UP", ({ order }) => this.pickedUp(order));
  }

  open(number: number, customer: string): void {
    this.orders.set(number, { number, customer, address: null, lines: [], total: 0, state: "Draft", packingStarted: false });
  }

  get(number: number): OrderRecord | undefined {
    return this.orders.get(number);
  }

  setAddress(number: number, address: string): void {
    const order = this.orders.get(number);
    if (order !== undefined && order.state === "Draft") order.address = address;
  }

  /** The warehouse took the first item of the order: from now on a cancellation needs a refund first. */
  startPacking(number: number): void {
    const order = this.orders.get(number);
    if (order !== undefined) order.packingStarted = true;
  }

  private confirm(number: number, lines: Line[]): void {
    const order = this.orders.get(number);
    if (order === undefined || order.state !== "Draft" || lines.length === 0) return;
    order.lines = lines;
    order.total = lineTotal(lines);
    order.state = "Awaiting payment";
    this.hub.emit("order.CONFIRMED", { order: number, total: order.total });
  }

  private paid(number: number): void {
    const order = this.orders.get(number);
    if (order === undefined || order.state !== "Awaiting payment") return;
    order.state = "Paid/Preparing";
    this.ports.requestPacking(order);
  }

  private declined(number: number): void {
    const order = this.orders.get(number);
    if (order === undefined || order.state !== "Awaiting payment") return;
    order.state = "Cancelled";
  }

  private cancel(number: number): void {
    const order = this.orders.get(number);
    if (order === undefined) return;
    if (order.state === "Paid/Preparing" && !order.packingStarted) order.state = "Cancelled";
    else if (order.state === "Paid/Preparing" || order.state === "Paid/Ready to ship") order.state = "Refunding";
    else return;
    this.hub.emit("order.REFUND_REQUESTED", { order: number });
  }

  private refunded(number: number): void {
    const order = this.orders.get(number);
    if (order !== undefined && order.state === "Refunding") order.state = "Cancelled";
  }

  private packed(number: number): void {
    const order = this.orders.get(number);
    if (order === undefined || order.state !== "Paid/Preparing") return;
    order.state = "Paid/Ready to ship";
    this.ports.requestPickup(order);
  }

  private pickedUp(number: number): void {
    const order = this.orders.get(number);
    if (order !== undefined && order.state === "Paid/Ready to ship") order.state = "Shipped";
  }
}
