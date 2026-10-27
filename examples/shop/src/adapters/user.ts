import type { Shop } from "../checkout";
import { lineTotal } from "../cart";
import type { Line } from "../events";
import { formatAmount } from "../money";

interface Screen {
  lines: Array<{ product: string; quantity: number; price: string }>;
  /** Every checkout screen shows the cart total at the bottom (`requirements/ui#checkout`). */
  footer: { label: "Total"; amount: string };
}

export interface OrderScreen extends Screen {
  number: number;
  badge: { text: "Paid"; colour: "green" } | null;
  actions: Array<{ label: "Cancel order"; style: "secondary"; confirm: string }>;
}

const rows = (lines: readonly Line[]) =>
  lines.map((l) => ({ product: l.product, quantity: l.quantity, price: formatAmount(l.quantity * l.unitPrice) }));

/** What the customer's pages call: one method per Event of the User Actor, plus the screens. */
export function createUserAdapter(shop: Shop) {
  return {
    openCart(customer: string): number {
      return shop.openOrder(customer);
    },
    addItem(order: number, product: string, unitPrice: number): void {
      shop.hub.emit("user.ADD_ITEM", { order, product, unitPrice });
    },
    checkout(order: number, address: string): void {
      if (address.trim() === "") throw new Error("A delivery address is needed to check out");
      shop.orders.setAddress(order, address);
      shop.hub.emit("user.CHECKOUT", { order });
    },
    cancel(order: number): void {
      shop.hub.emit("user.CANCEL", { order });
    },

    cartScreen(order: number): Screen {
      const lines = shop.carts.get(order)?.lines ?? [];
      return { lines: rows(lines), footer: { label: "Total", amount: formatAmount(lineTotal(lines)) } };
    },
    orderScreen(order: number): OrderScreen | undefined {
      const record = shop.orders.get(order);
      if (record === undefined) return undefined;
      const paid = record.state.startsWith("Paid/");
      return {
        number: record.number,
        lines: rows(record.lines),
        footer: { label: "Total", amount: formatAmount(record.total) },
        badge: paid ? { text: "Paid", colour: "green" } : null,
        actions: paid ? [{ label: "Cancel order", style: "secondary", confirm: "Cancel this order?" }] : [],
      };
    },
  };
}
