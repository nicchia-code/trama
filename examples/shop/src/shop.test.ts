import { beforeEach, expect, test } from "bun:test";
import { createCourierAdapter } from "./adapters/courier";
import { handleStripeWebhook } from "./adapters/stripe";
import { createUserAdapter } from "./adapters/user";
import { createWarehouseAdapter } from "./adapters/warehouse";
import { createShop } from "./checkout";

const calls: string[] = [];
const shop = createShop({
  stripe: { charge: (order, amount) => calls.push(`charge ${order} ${amount}`), refund: (id) => calls.push(`refund ${id}`) },
  warehouse: { requestPacking: (order) => calls.push(`pack ${order.number}`) },
  courier: { requestPickup: (order) => calls.push(`pickup ${order.number}`) },
});
const user = createUserAdapter(shop);
const warehouse = createWarehouseAdapter(shop.hub, shop.orders);
const courier = createCourierAdapter(shop.hub);
const stripe = (type: "charge.succeeded" | "charge.failed" | "charge.refunded", order: number) =>
  handleStripeWebhook(shop.hub, { type, id: `ch_${order}`, metadata: { order: String(order) } });

function checkedOut(): number {
  const order = user.openCart("ada@example.com");
  user.addItem(order, "Dune", 1250);
  user.addItem(order, "Dune", 1250);
  user.addItem(order, "Emma", 900);
  user.checkout(order, "1 Main Street");
  return order;
}

beforeEach(() => {
  calls.length = 0;
});

test("a paid order is packed, collected and shipped", () => {
  const order = checkedOut();
  expect(shop.orders.get(order)).toMatchObject({ state: "Awaiting payment", total: 3400 });
  expect(calls).toEqual([`charge ${order} 3400`]);
  stripe("charge.succeeded", order);
  expect(shop.orders.get(order)?.state).toBe("Paid/Preparing");
  warehouse.packageReady(order);
  expect(shop.orders.get(order)?.state).toBe("Paid/Ready to ship");
  courier.pickedUp(order);
  expect(shop.orders.get(order)?.state).toBe("Shipped");
  expect(calls).toEqual([`charge ${order} 3400`, `pack ${order}`, `pickup ${order}`]);
});

test("a declined card cancels the order", () => {
  const order = checkedOut();
  stripe("charge.failed", order);
  expect(shop.orders.get(order)?.state).toBe("Cancelled");
  expect(shop.payments.get(order)?.state).toBe("Declined");
});

test("an empty cart cannot be confirmed", () => {
  const order = user.openCart("ada@example.com");
  user.checkout(order, "1 Main Street");
  expect(shop.orders.get(order)?.state).toBe("Draft");
});

test("cancelling before packing starts cancels at once and asks for the refund", () => {
  const order = checkedOut();
  stripe("charge.succeeded", order);
  user.cancel(order);
  expect(shop.orders.get(order)?.state).toBe("Cancelled");
  expect(calls).toContain(`refund ch_${order}`);
});

test("cancelling after packing started waits for the refund", () => {
  const order = checkedOut();
  stripe("charge.succeeded", order);
  warehouse.packingStarted(order);
  user.cancel(order);
  expect(shop.orders.get(order)?.state).toBe("Refunding");
  stripe("charge.refunded", order);
  expect(shop.orders.get(order)?.state).toBe("Cancelled");
  expect(shop.payments.get(order)?.state).toBe("Refunded");
});

test("screens show two-decimal amounts, the Paid badge and the total at the bottom", () => {
  const order = checkedOut();
  expect(user.cartScreen(order).footer).toEqual({ label: "Total", amount: "€34.00" });
  expect(user.orderScreen(order)?.badge).toBeNull();
  stripe("charge.succeeded", order);
  const screen = user.orderScreen(order);
  expect(screen?.badge).toEqual({ text: "Paid", colour: "green" });
  expect(screen?.actions[0]).toMatchObject({ label: "Cancel order", style: "secondary" });
  expect(screen?.footer.amount).toBe("€34.00");
});
