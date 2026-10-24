import { describe, expect, test } from "bun:test";
import { memorySendModeStore, readSendMode, SEND_MODE_KEY } from "../extension/src/host/omp-chat/send-mode";

describe("the Steer|Queue choice kept by the window", () => {
  test("a saved queue is read as queue; anything else, absent included, is steer", () => {
    expect(readSendMode("queue")).toBe("queue");
    expect(readSendMode("steer")).toBe("steer");
    expect(readSendMode(undefined)).toBe("steer");
    expect(readSendMode("other")).toBe("steer");
  });

  test("the choice is kept under its key and read back", async () => {
    const store = memorySendModeStore();
    expect(readSendMode(store.get(SEND_MODE_KEY))).toBe("steer");
    await store.update(SEND_MODE_KEY, "queue");
    expect(readSendMode(store.get(SEND_MODE_KEY))).toBe("queue");
  });
});
