import type { Hub, Line } from "./events";
import type { Cents } from "./money";

export type CartState = "Empty" | "Has items" | "Confirmed";

export interface CartRecord {
  state: CartState;
  lines: Line[];
}

export function lineTotal(lines: readonly Line[]): Cents {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

/** The cart machine: one cart per order, from Empty to Confirmed. */
export class Carts {
  private readonly carts = new Map<number, CartRecord>();

  constructor(private readonly hub: Hub) {
    hub.on("user.ADD_ITEM", ({ order, product, unitPrice }) => this.addItem(order, product, unitPrice));
    hub.on("user.CHECKOUT", ({ order }) => this.checkout(order));
  }

  open(order: number): void {
    this.carts.set(order, { state: "Empty", lines: [] });
  }

  get(order: number): CartRecord | undefined {
    return this.carts.get(order);
  }

  private addItem(order: number, product: string, unitPrice: Cents): void {
    const cart = this.carts.get(order);
    if (cart === undefined || cart.state === "Confirmed") return;
    const line = cart.lines.find((l) => l.product === product);
    if (line === undefined) cart.lines.push({ product, quantity: 1, unitPrice });
    else line.quantity += 1;
    cart.state = "Has items";
  }

  private checkout(order: number): void {
    const cart = this.carts.get(order);
    if (cart === undefined || cart.state !== "Has items") return;
    cart.state = "Confirmed";
    this.hub.emit("cart.CONFIRM", { order, lines: cart.lines.map((l) => ({ ...l })) });
  }
}
