import { describe, expect, test } from "bun:test";
import {
  type ChainFact,
  NO_REFINEMENT,
  type PickFact,
  type RefinementJob,
  type RefinementState,
  REFINE_ALL_NONE,
  REFINE_ALL_OFF,
  backlogOrder,
  beginRefinement,
  cancelRefineAllAllowed,
  chainsOf,
  dependencyOrder,
  dequeue,
  emptyQueue,
  endRefinementJob,
  enqueue,
  markDelivered,
  planQueue,
  refinable,
  refineAllBlockers,
  refineAllClicked,
  refineAllPick,
  refinementEnd,
  refinementNotes,
  refinementView,
  switchedOff,
  withdraw,
  writtenNow,
} from "../extension/src/host/refinement";
import { shareSeats } from "../extension/src/host/run-groups";

/** A Proposal the queue knows: its creation instant is its position, so the Backlog order is the order of the calls. */
let created = 0;
const fact = (id: string, touched: string[] = [], requires: string[] = [], extra: Partial<ChainFact> = {}): ChainFact => ({ id, created: `2026-01-01T00:00:${String(created++).padStart(2, "0")}Z`, touched, requires, ...extra });
const facts = (...list: ChainFact[]) => new Map(list.map((item) => [item.id, item]));
const job = (proposal: string, seats = 1, extra: Partial<RefinementJob> = {}): RefinementJob => ({ proposal, seats, job: `job-${proposal}`, delivered: false, ...extra });
const running = (...jobs: RefinementJob[]) => new Map(jobs.map((item) => [item.proposal, item]));

describe("refinement state", () => {
  test("enqueue appends once, ignores a refinement at work and takes a waiting Proposal back to the queue", () => {
    const first = enqueue(NO_REFINEMENT, ["a", "b", "a"]);
    expect(first.queued).toEqual(["a", "b"]);
    expect(enqueue(first, ["b"])).toBe(first);
    const working = beginRefinement(first, job("a"));
    expect(enqueue(working, ["a"])).toBe(working);
    const waiting: RefinementState = { ...NO_REFINEMENT, waiting: ["w"] };
    const again = enqueue(waiting, ["w"]);
    expect(again.queued).toEqual(["w"]);
    expect(again.waiting).toEqual([]);
  });

  test("beginning a refinement takes the Proposal out of the queue and holds its places; the others are not touched", () => {
    const state = beginRefinement(enqueue(NO_REFINEMENT, ["a", "b"]), job("a", 3));
    expect(state.queued).toEqual(["b"]);
    expect([...state.running.keys()]).toEqual(["a"]);
    expect(state.running.get("a")?.seats).toBe(3);
  });

  test("withdraw and dequeue take a Proposal out of the queue; only withdraw also leaves the waiting list; one at work stays", () => {
    const state: RefinementState = { ...beginRefinement(enqueue(NO_REFINEMENT, ["a", "b"]), job("w")), waiting: ["x"] };
    expect(dequeue(state, "a").queued).toEqual(["b"]);
    expect(dequeue(state, "x").waiting).toEqual(["x"]);
    expect(withdraw(state, "x").waiting).toEqual([]);
    expect(withdraw(state, "w")).toBe(state);
    expect(dequeue(state, "w")).toBe(state);
  });

  test("the end of a job is idempotent, frees only its own places and leaves the other jobs at work", () => {
    const state = beginRefinement(beginRefinement(NO_REFINEMENT, job("a", 2)), job("b", 3));
    expect(endRefinementJob(state, "a", "other-job")).toBeNull();
    const ended = endRefinementJob(state, "a", "job-a");
    expect(ended?.ended.seats).toBe(2);
    expect([...(ended?.state.running.keys() ?? [])]).toEqual(["b"]);
    expect(ended === null ? null : endRefinementJob(ended.state, "a", "job-a")).toBeNull();
  });

  test("a delivery is remembered by the refinement that works on that Proposal only", () => {
    const state = beginRefinement(beginRefinement(NO_REFINEMENT, job("a")), job("b"));
    const delivered = markDelivered(state, "b");
    expect(delivered.running.get("a")?.delivered).toBe(false);
    expect(delivered.running.get("b")?.delivered).toBe(true);
    expect(markDelivered(delivered, "c")).toBe(delivered);
    expect(endRefinementJob(delivered, "b", "job-b")?.ended.delivered).toBe(true);
  });

  test("Refine All is in progress while the queue holds a Proposal that waits to start", () => {
    const queued = enqueue(NO_REFINEMENT, ["a", "b"]);
    const clicked = refineAllClicked(queued, 1000);
    expect(clicked.refineAllSince).toBe(1000);
    // A second click while it is in progress keeps the first instant.
    expect(refineAllClicked(clicked, 5000).refineAllSince).toBe(1000);
    // Nothing queued: no Refine All.
    expect(refineAllClicked(NO_REFINEMENT, 1000).refineAllSince).toBeNull();
    // Some start, one waits: still in progress; the last one starts: over, though refinements are at work.
    const partly = beginRefinement(clicked, job("a"));
    expect(partly.refineAllSince).toBe(1000);
    const all = beginRefinement(partly, job("b"));
    expect(all.refineAllSince).toBeNull();
    expect(all.running.size).toBe(2);
    // Cancel on the cards ends it too.
    expect(dequeue(dequeue(clicked, "a"), "b").refineAllSince).toBeNull();
    expect(withdraw(withdraw(clicked, "a"), "b").refineAllSince).toBeNull();
  });

  test("Cancel Refine All works only while it is in progress and two seconds after the click, and empties the whole queue", () => {
    const approved = enqueue(NO_REFINEMENT, ["approved-with-approve"]);
    const clicked = refineAllClicked(enqueue(beginRefinement(approved, job("busy")), ["a", "b"]), 10_000);
    expect(clicked.queued).toEqual(["approved-with-approve", "a", "b"]);
    expect(cancelRefineAllAllowed(NO_REFINEMENT, 99_999)).toBe(false);
    expect(cancelRefineAllAllowed(approved, 99_999)).toBe(false);
    expect(cancelRefineAllAllowed(clicked, 11_999)).toBe(false);
    expect(cancelRefineAllAllowed(clicked, 12_000)).toBe(true);
    const cancelled = emptyQueue({ ...clicked, waiting: ["w"] });
    expect(cancelled.queued).toEqual([]);
    expect(cancelled.refineAllSince).toBeNull();
    // The refinements at work and the Proposals waiting for a Run stay.
    expect([...cancelled.running.keys()]).toEqual(["busy"]);
    expect(cancelled.waiting).toEqual(["w"]);
  });

  test("turning the setting off empties the queue and the waiting list and ends Refine All; the jobs at work go on", () => {
    const state: RefinementState = { ...refineAllClicked(beginRefinement(enqueue(NO_REFINEMENT, ["a", "b"]), job("a")), 1), waiting: ["w"] };
    const off = switchedOff(state);
    expect(off.queued).toEqual([]);
    expect(off.waiting).toEqual([]);
    expect(off.refineAllSince).toBeNull();
    expect([...off.running.keys()]).toEqual(["a"]);
    expect(switchedOff(NO_REFINEMENT)).toBe(NO_REFINEMENT);
  });

  test("backlogOrder sorts by creation, then identity, and puts unknown creation last", () => {
    expect(
      backlogOrder([
        { id: "c", created: "2026-01-02T00:00:00Z" },
        { id: "b", created: "2026-01-01T00:00:00Z" },
        { id: "a", created: "2026-01-01T00:00:00Z" },
        { id: "z", created: null },
      ]),
    ).toEqual(["a", "b", "c", "z"]);
  });
});

describe("chains", () => {
  test("Proposals touching a common file are one chain, transitively; disjoint files make separate chains", () => {
    const a = fact("a", ["x.md"]);
    const b = fact("b", ["y.md"]);
    const c = fact("c", ["x.md", "y.md"]);
    const d = fact("d", ["z.md"]);
    const chains = chainsOf([a, b, c, d]);
    expect(chains.map((chain) => [...chain].sort())).toEqual([["a", "b", "c"], ["d"]]);
  });

  test("a Proposal that requires another is in its chain, also through a third, even with no file in common", () => {
    const a = fact("a", ["x.md"]);
    const b = fact("b", ["y.md"], ["a"]);
    const c = fact("c", ["w.md"], ["b"]);
    const d = fact("d", ["z.md"]);
    expect(chainsOf([a, b, c, d])).toEqual([["a", "b", "c"], ["d"]]);
  });

  test("a required Proposal that is neither queued nor at work links nothing", () => {
    const a = fact("a", ["x.md"], ["gone"]);
    const b = fact("b", ["y.md"], ["gone"]);
    expect(chainsOf([a, b])).toEqual([["a"], ["b"]]);
  });

  test("inside a chain the required come first, then the Backlog order", () => {
    const old = fact("old", ["x.md"], ["newer"]);
    const newer = fact("newer", ["x.md"]);
    const last = fact("last", ["x.md"]);
    expect(chainsOf([old, newer, last])).toEqual([["newer", "old", "last"]]);
  });

  test("dependencyOrder breaks a cycle at the first Proposal of the Backlog", () => {
    const rank = new Map([["a", 0], ["b", 1]]);
    const requires: Record<string, string[]> = { a: ["b"], b: ["a"] };
    expect(dependencyOrder(["b", "a"], (id) => requires[id] ?? [], rank)).toEqual(["a", "b"]);
  });

  test("the chains follow the Backlog position of their first Proposal", () => {
    const first = fact("first", ["a.md"]);
    const second = fact("second", ["b.md"]);
    const third = fact("third", ["a.md"]);
    expect(chainsOf([second, third, first])).toEqual([["first", "third"], ["second"]]);
  });
});

describe("planning the queue", () => {
  test("the first Proposal of each free chain is ready; chains work together", () => {
    const a = fact("a", ["x.md"]);
    const b = fact("b", ["x.md"]);
    const c = fact("c", ["y.md"]);
    const plan = planQueue({ queued: ["a", "b", "c"], running: new Map(), waiting: [], facts: facts(a, b, c), limit: 20 });
    expect(plan.start.map((start) => start.proposal)).toEqual(["a", "c"]);
    expect(plan.waits.get("b")).toEqual({ waiting: "chain", on: "a" });
    expect(plan.drop).toEqual([]);
  });

  test("a chain with a refinement at work is not ready, and its queued Proposals wait for the one at work", () => {
    const a = fact("a", ["x.md"]);
    const b = fact("b", ["x.md"]);
    const c = fact("c", ["x.md"]);
    const plan = planQueue({ queued: ["b", "c"], running: running(job("a", 2)), waiting: [], facts: facts(a, b, c), limit: 20 });
    expect(plan.start).toEqual([]);
    expect(plan.waits.get("b")).toEqual({ waiting: "chain", on: "a" });
    expect(plan.waits.get("c")).toEqual({ waiting: "chain", on: "a" });
  });

  test("a Proposal that requires a queued one waits for its approval, and the required one starts first", () => {
    const base = fact("base", ["x.md"]);
    const top = fact("top", ["y.md"], ["base"]);
    const plan = planQueue({ queued: ["base", "top"], running: new Map(), waiting: [], facts: facts(base, top), limit: 20 });
    expect(plan.start.map((start) => start.proposal)).toEqual(["base"]);
    expect(plan.waits.get("top")).toEqual({ waiting: "approval", on: "base" });
    // Once base is at work, top still waits for its approval, not for the chain.
    const later = planQueue({ queued: ["top"], running: running(job("base")), waiting: [], facts: facts(base, top), limit: 20 });
    expect(later.start).toEqual([]);
    expect(later.waits.get("top")).toEqual({ waiting: "approval", on: "base" });
  });

  test("a Proposal waits for a required one refined and waiting for a Run", () => {
    const top = fact("top", ["y.md"], ["base"]);
    const plan = planQueue({ queued: ["top"], running: new Map(), waiting: ["base"], facts: facts(top), limit: 20 });
    expect(plan.drop).toEqual([]);
    expect(plan.start).toEqual([]);
    expect(plan.waits.get("top")).toEqual({ waiting: "approval", on: "base" });
  });

  test("a Proposal that waits for a required one that is no longer queued, at work or waiting leaves the queue without starting, and so do those that waited for it", () => {
    const top = fact("top", ["y.md"], ["base"]);
    const above = fact("above", ["z.md"], ["top"]);
    const free = fact("free", ["w.md"]);
    const plan = planQueue({ queued: ["top", "above", "free"], running: new Map(), waiting: [], facts: facts(top, above, free), limit: 20 });
    expect(plan.drop.sort()).toEqual(["above", "top"]);
    expect(plan.start.map((start) => start.proposal)).toEqual(["free"]);
  });

  test("a Proposal that requires a missing Proposal, or without facts, leaves the queue", () => {
    const broken = fact("broken", ["x.md"], ["ghost"], { broken: true });
    const plan = planQueue({ queued: ["broken", "unknown"], running: new Map(), waiting: [], facts: facts(broken), limit: 20 });
    expect(plan.drop.sort()).toEqual(["broken", "unknown"]);
  });

  test("the places are shared equally among the Proposals that start together, the rest to the first", () => {
    const list = ["a", "b", "c"].map((id) => fact(id, [`${id}.md`]));
    const plan = planQueue({ queued: ["a", "b", "c"], running: new Map(), waiting: [], facts: facts(...list), limit: 20 });
    expect(plan.start).toEqual([
      { proposal: "a", seats: 7 },
      { proposal: "b", seats: 7 },
      { proposal: "c", seats: 6 },
    ]);
    expect(plan.start.reduce((sum, start) => sum + start.seats, 0)).toBe(20);
  });

  test("with a small limit only as many start as there are free places, one place each; the others wait for a slot", () => {
    const list = ["a", "b", "c", "d"].map((id) => fact(id, [`${id}.md`]));
    const plan = planQueue({ queued: ["a", "b", "c", "d"], running: new Map(), waiting: [], facts: facts(...list), limit: 2 });
    expect(plan.start).toEqual([
      { proposal: "a", seats: 1 },
      { proposal: "b", seats: 1 },
    ]);
    expect(plan.waits.get("c")).toEqual({ waiting: "slot" });
    expect(plan.waits.get("d")).toEqual({ waiting: "slot" });
  });

  test("the places held by the refinements at work are not free; with none free a ready chain waits for a slot", () => {
    const a = fact("a", ["a.md"]);
    const b = fact("b", ["b.md"]);
    const c = fact("c", ["c.md"]);
    const some = planQueue({ queued: ["b", "c"], running: running(job("a", 18)), waiting: [], facts: facts(a, b, c), limit: 20 });
    expect(some.start).toEqual([
      { proposal: "b", seats: 1 },
      { proposal: "c", seats: 1 },
    ]);
    const none = planQueue({ queued: ["b", "c"], running: running(job("a", 20)), waiting: [], facts: facts(a, b, c), limit: 20 });
    expect(none.start).toEqual([]);
    expect(none.waits.get("b")).toEqual({ waiting: "slot" });
    expect(none.waits.get("c")).toEqual({ waiting: "slot" });
  });

  test("a limit lowered below the places held starts nothing, and never makes the places negative", () => {
    const a = fact("a", ["a.md"]);
    const b = fact("b", ["b.md"]);
    const plan = planQueue({ queued: ["b"], running: running(job("a", 5)), waiting: [], facts: facts(a, b), limit: 3 });
    expect(plan.start).toEqual([]);
  });

  test("the sum of the places held never exceeds the limit, for any number of ready chains", () => {
    for (const limit of [1, 2, 3, 7, 20]) {
      for (const count of [1, 2, 5, 9, 25]) {
        const ids = Array.from({ length: count }, (_, index) => `p${String(index).padStart(2, "0")}`);
        const plan = planQueue({ queued: ids, running: new Map(), waiting: [], facts: facts(...ids.map((id) => fact(id, [`${id}.md`]))), limit });
        const total = plan.start.reduce((sum, start) => sum + start.seats, 0);
        expect(plan.start.length).toBe(Math.min(count, limit));
        expect(total).toBeLessThanOrEqual(limit);
        expect(total).toBe(Math.min(limit, Math.max(count, limit)));
        expect(plan.start.every((start) => start.seats >= 1)).toBe(true);
      }
    }
    expect(shareSeats([1, 1, 1], 10)).toEqual([4, 3, 3]);
  });

  test("a Proposal that came back to the queue after a new approval goes at its place of the Backlog", () => {
    const early = fact("early", ["x.md"]);
    const late = fact("late", ["x.md"]);
    const again = enqueue({ ...NO_REFINEMENT, queued: ["late"] }, ["early"]);
    // The caller orders the queue by the Backlog; the plan reads the order of the chain by the Backlog too.
    const plan = planQueue({ queued: again.queued, running: new Map(), waiting: [], facts: facts(late, early), limit: 20 });
    expect(plan.start.map((start) => start.proposal)).toEqual(["early"]);
    expect(plan.waits.get("late")).toEqual({ waiting: "chain", on: "early" });
  });
});

describe("Refine All", () => {
  const pick = (id: string, block: PickFact["block"] = "none", requires: string[] = []): PickFact => ({ id, block, requires });

  test("takes, in Backlog order, the refinable Proposals whose Approve would be available", () => {
    expect(refineAllPick([pick("a"), pick("b", "other"), pick("c")], new Set())).toEqual(["a", "c"]);
  });

  test("takes a Proposal blocked only by required ones when each of them is taken, queued, at work or waiting", () => {
    const taken = refineAllPick([pick("a"), pick("b", "requires", ["a"])], new Set());
    expect(taken).toEqual(["a", "b"]);
    expect(refineAllPick([pick("b", "requires", ["queued"])], new Set(["queued"]))).toEqual(["b"]);
    expect(refineAllPick([pick("b", "requires", ["busy"])], new Set(["busy"]))).toEqual(["b"]);
    expect(refineAllPick([pick("b", "requires", ["run"])], new Set(["run"]))).toEqual(["b"]);
  });

  test("the relation is transitive, in any order of the candidates", () => {
    const chain = [pick("c", "requires", ["b", "a"]), pick("b", "requires", ["a"]), pick("a")];
    expect(refineAllPick(chain, new Set())).toEqual(["c", "b", "a"]);
  });

  test("a Proposal that requires one that is not taken, or that is blocked for another reason, is not taken", () => {
    expect(refineAllPick([pick("a", "other"), pick("b", "requires", ["a"])], new Set())).toEqual([]);
    expect(refineAllPick([pick("b", "requires", ["open-not-stale"])], new Set())).toEqual([]);
    expect(refineAllPick([pick("a", "requires", ["b"]), pick("b", "requires", ["a"])], new Set())).toEqual([]);
  });

  test("the count is what a click takes; the reasons come in order: setting off, then nothing to refine", () => {
    expect(refineAllBlockers(false, 0)).toEqual([REFINE_ALL_OFF, REFINE_ALL_NONE]);
    expect(refineAllBlockers(true, 0)).toEqual([REFINE_ALL_NONE]);
    expect(refineAllBlockers(true, 3)).toEqual([]);
    expect(REFINE_ALL_OFF).toBe("Turn on Auto-update Stale Proposals in Settings");
    expect(REFINE_ALL_NONE).toBe("No Proposal to refine");
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

  test("requeues a delivered Proposal that is stale again, and keeps one blocked for another reason", () => {
    expect(refinementEnd({ ...base, stale: true })).toBe("requeue");
    expect(refinementEnd({ ...base, blocked: true })).toBe("keep");
  });

  test("a Proposal that came back stale rejoins the queue without a click, and Refine All stays in progress", () => {
    const state = refineAllClicked(beginRefinement(enqueue(NO_REFINEMENT, ["b"]), job("a")), 1);
    const ended = endRefinementJob(state, "a", "job-a");
    const outcome = refinementEnd({ ...base, stale: true });
    const back = outcome === "requeue" && ended !== null ? enqueue(ended.state, ["a"]) : state;
    expect(back.queued).toEqual(["b", "a"]);
    expect(back.refineAllSince).toBe(1);
  });
});

describe("refinable and view", () => {
  const stale = { kind: "change", attached: false, open: true, stale: true, draftRefining: false, writing: false };

  test("a stale open change is refinable; a fresh, attached or other kind is not", () => {
    expect(refinable(stale)).toBe(true);
    expect(refinable({ ...stale, stale: false })).toBe(false);
    expect(refinable({ ...stale, attached: true })).toBe(false);
    expect(refinable({ ...stale, kind: "import" })).toBe(false);
    expect(refinable({ ...stale, kind: "setup" })).toBe(false);
    expect(refinable({ ...stale, kind: "resolution" })).toBe(false);
  });

  test("a Draft left refining is refinable unless a window writes it", () => {
    const draft = { ...stale, open: false, stale: false, draftRefining: true };
    expect(refinable(draft)).toBe(true);
    expect(refinable({ ...draft, writing: true })).toBe(false);
    expect(refinable({ ...draft, draftRefining: false })).toBe(false);
  });

  test("a Draft is written when a refinement of this window runs it or any live announcement is bound to it", () => {
    const running = new Map([["a", { seats: 1 }]]);
    expect(writtenNow("a", running, [])).toBe(true);
    // Another window, an agent started before the editor was reopened, a refinement launched by hand: only the bound announcement is seen.
    expect(writtenNow("b", running, [{ proposal: "b" }])).toBe(true);
    expect(writtenNow("b", running, [{ proposal: null }, { proposal: "c" }])).toBe(false);
    expect(writtenNow("b", new Map(), [])).toBe(false);
    // A Draft being written is never refinable, whoever writes it.
    const draft = { kind: "change", attached: false, open: false, stale: false, draftRefining: true };
    expect(refinable({ ...draft, writing: writtenNow("b", running, [{ proposal: "b" }]) })).toBe(false);
    expect(refinable({ ...draft, writing: writtenNow("b", running, []) })).toBe(true);
  });

  test("the view lists the refinements at work in the order they started, the queue with its reasons and the Refine All entry", () => {
    const state = refineAllClicked(beginRefinement(beginRefinement(enqueue(NO_REFINEMENT, ["c", "d"]), job("b")), job("a")), 4242);
    const waits = new Map([["c", { waiting: "chain" as const, on: "b" }]]);
    const view = refinementView({ state: { ...state, waiting: ["w"] }, enabled: true, runInProgress: true, waits, count: 2, notes: { b: "Reading the order" } });
    expect(view.running).toEqual(["b", "a"]);
    expect(view.queued).toEqual([
      { proposal: "c", waiting: "chain", on: "b" },
      { proposal: "d", waiting: "slot" },
    ]);
    expect(view.waiting).toEqual(["w"]);
    expect(view.runInProgress).toBe(true);
    expect(view.notes).toEqual({ b: "Reading the order" });
    expect(view.refineAll).toEqual({ mode: "cancel", count: 2, blockers: [], since: 4242 });
  });

  test("without Refine All in progress the entry is refine, with no instant, and carries its reasons", () => {
    const view = refinementView({ state: NO_REFINEMENT, enabled: false, runInProgress: false, waits: new Map(), count: 0, notes: {} });
    expect(view.refineAll).toEqual({ mode: "refine", count: 0, blockers: [REFINE_ALL_OFF, REFINE_ALL_NONE] });
    expect("since" in view.refineAll).toBe(false);
  });

  test("the notes of the refinements at work are the latest note of the announcement bound to each Proposal", () => {
    const at = "2026-10-01T10:00:00.000Z";
    const notes = refinementNotes(
      [
        { kind: "proposal", proposal: "a", notes: [{ at, text: "Reading" }, { at, text: "Rewriting the files" }] },
        { kind: "proposal", proposal: "b", notes: [] },
        { kind: "proposal", proposal: "gone", notes: [{ at, text: "Not at work" }] },
        { kind: "work", proposal: null, notes: [{ at, text: "Importing" }] },
        { kind: "drift", proposal: "a", notes: [{ at, text: "Not a Proposal's" }] },
      ],
      ["a", "b"],
    );
    expect(notes).toEqual({ a: "Rewriting the files" });
  });
});
