import { expect, test } from "bun:test";
import { drain, drainAsync, type Steps } from "../src/core/steps";

function* counting(log: string[]): Steps<number> {
  for (let n = 1; n <= 3; n++) {
    log.push(`step ${n}`);
    yield;
  }
  return 3;
}

test("drain runs every step in one go and gives back the result", () => {
  const log: string[] = [];
  expect(drain(counting(log))).toBe(3);
  expect(log).toEqual(["step 1", "step 2", "step 3"]);
});

test("drainAsync gives the thread back between the steps and gives back the same result", async () => {
  const log: string[] = [];
  const running = drainAsync(counting(log));
  // The first step ran at once; the rest wait for the event loop, which other work gets to use meanwhile.
  expect(log).toEqual(["step 1"]);
  const other = Promise.resolve().then(() => log.push("other work"));
  expect(await running).toBe(3);
  await other;
  expect(log).toEqual(["step 1", "other work", "step 2", "step 3"]);
});

test("an error in a step reaches whoever waits", async () => {
  function* failing(): Steps<never> {
    yield;
    throw new Error("broken step");
  }
  expect(() => drain(failing())).toThrow("broken step");
  await expect(drainAsync(failing())).rejects.toThrow("broken step");
});
