import type { Hub } from "../events";
import type { OrderRecord, Orders } from "../order";

/** What the shop sends to the warehouse: the order to pack. */
export interface WarehousePort {
  requestPacking(order: OrderRecord): void;
}

/** What the warehouse's tablets call back with. */
export function createWarehouseAdapter(hub: Hub, orders: Orders) {
  return {
    /** A packer took the first item of the order. */
    packingStarted(order: number): void {
      orders.startPacking(order);
    },
    /** The order is packed and waits for the courier. */
    packageReady(order: number): void {
      hub.emit("warehouse.PACKAGE_READY", { order });
    },
  };
}
