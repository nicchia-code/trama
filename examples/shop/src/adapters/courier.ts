import type { Hub } from "../events";
import type { OrderRecord } from "../order";

/** What the shop sends to the courier: the package to collect, with where it goes. */
export interface CourierPort {
  requestPickup(order: OrderRecord): void;
}

/** What the courier's service calls back with. */
export function createCourierAdapter(hub: Hub) {
  return {
    pickedUp(order: number): void {
      hub.emit("courier.PICKED_UP", { order });
    },
  };
}
