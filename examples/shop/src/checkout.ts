import type { CourierPort } from "./adapters/courier";
import type { WarehousePort } from "./adapters/warehouse";
import { Carts } from "./cart";
import { Hub } from "./events";
import { Orders } from "./order";
import { Payments, type StripeGateway } from "./payment";

export interface ShopPorts {
  stripe: StripeGateway;
  warehouse: WarehousePort;
  courier: CourierPort;
}

/** The checkout Feature: the machines wired to one bus and to the outside through the ports. */
export interface Shop {
  hub: Hub;
  carts: Carts;
  orders: Orders;
  payments: Payments;
  /** Starts an order with its empty cart and returns its number. */
  openOrder(customer: string): number;
}

export function createShop(ports: ShopPorts): Shop {
  const hub = new Hub();
  const carts = new Carts(hub);
  const orders = new Orders(hub, {
    requestPacking: (order) => ports.warehouse.requestPacking(order),
    requestPickup: (order) => ports.courier.requestPickup(order),
  });
  const payments = new Payments(hub, ports.stripe);
  let last = 1000;
  return {
    hub,
    carts,
    orders,
    payments,
    openOrder(customer) {
      const number = ++last;
      carts.open(number);
      orders.open(number, customer);
      return number;
    },
  };
}
