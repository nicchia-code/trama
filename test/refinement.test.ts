import { describe, expect, test } from "bun:test";
import {
  NO_REFINEMENT,
  backlogOrder,
  enqueue,
  nextToRefine,
  refinable,
  refinementEnd,
  refinementView,
  withdraw,
} from "../extension/src/host/refinement";

describe("refinement queue", () => {
  test("enqueue appends once and ignores the running Proposal", () => {
    const running = { ...NO_REFINEMENT, running: "aaaa1111" };
    expect(enqueue(running, "aaaa1111")).toBe(running);
    const one = enqueue(NO_REFINEMENT, "bbbb2222");
    expect(enqueue(one, "bbbb2222")).toBe(one);
    expect(enqueue(one, "cccc3333").queued).toEqual(["bbbb2222", "cccc3333"]);
  });

  test("withdraw removes a queued Proposal and leaves a running one", () => {
    const state = { ...NO_REFINEMENT, queued: ["aaaa1111", "bbbb2222"], running: "cccc3333" };
    expect(withdraw(state, "aaaa1111").queued).toEqual(["bbbb2222"]);
    expect(withdraw(state, "cccc3333")).toBe(state);
  });

  test("backlogOrder sorts by creation, then identity, and puts unknown creation last", () => {
    expect(
      backlogOrder([
        { id: "zzzz0000", created: null },
        { id: "bbbb2222", created: "2026-02-01T00:00:00Z" },
        { id: "aaaa1111", created: "2026-01-01T00:00:00Z" },
        { id: "cccc3333", created: "2026-02-01T00:00:00Z" },
      ]),
    ).toEqual(["aaaa1111", "bbbb2222", "cccc3333", "zzzz0000"]);
  });

  test("nextToRefine drops the Proposals no longer refinable", () => {
    const picked = nextToRefine(["aaaa1111", "bbbb2222", "cccc3333"], (id) => id !== "aaaa1111");
    expect(picked).toEqual({ next: "bbbb2222", queued: ["cccc3333"] });
    expect(nextToRefine([], () => true)).toEqual({ next: null, queued: [] });
  });
});

describe("refinement end", () => {
  const base = { delivered: true, open: true, stale: false, blocked: false };

  test("approves a delivered, unblocked Proposal", () => {
    expect(refinementEnd(base)).toBe("approve");
  });

  test("drops when nothing was delivered or the Proposal is not Open", () => {
    expect(refinementEnd({ ...base, delivered: false })).toBe("drop");
    expect(refinementEnd({ ...base, open: false })).toBe("drop");
  });

  test("requeues a delivered Proposal that is still stale", () => {
    expect(refinementEnd({ ...base, stale: true })).toBe("requeue");
  });

  test("keeps a delivered Proposal blocked for another reason", () => {
    expect(refinementEnd({ ...base, blocked: true })).toBe("keep");
  });
});

describe("refinable and view", () => {
  const stale = { kind: "change", attached: false, open: true, stale: true, draftRefining: false, writing: false };

  test("a stale open change is refinable; a fresh or attached one is not", () => {
    expect(refinable(stale)).toBe(true);
    expect(refinable({ ...stale, stale: false })).toBe(false);
    expect(refinable({ ...stale, attached: true })).toBe(false);
    expect(refinable({ ...stale, kind: "task" })).toBe(false);
  });

  test("a Draft left refining is refinable unless a window writes it", () => {
    const draft = { ...stale, open: false, stale: false, draftRefining: true };
    expect(refinable(draft)).toBe(true);
    expect(refinable({ ...draft, writing: true })).toBe(false);
  });

  test("the view carries the state, the run flag and the waiting list, and no note", () => {
    expect(refinementView({ ...NO_REFINEMENT, queued: ["aaaa1111"], running: "bbbb2222", waiting: ["cccc3333"] }, true, true)).toEqual({
      enabled: true,
      running: "bbbb2222",
      queued: ["aaaa1111"],
      note: null,
      runInProgress: true,
      waiting: ["cccc3333"],
    });
  });

  test("withdraw takes a Proposal out of the queue and out of the waiting list", () => {
    const state = { ...NO_REFINEMENT, queued: ["aaaa1111"], waiting: ["bbbb2222", "cccc3333"] };
    expect(withdraw(state, "bbbb2222").waiting).toEqual(["cccc3333"]);
    expect(withdraw(state, "aaaa1111").queued).toEqual([]);
    expect(withdraw(state, "dddd4444")).toBe(state);
  });
});
