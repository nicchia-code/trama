import { EMPTY_SPECS } from "../src/core/specs";
import { describe, expect, test } from "bun:test";
import type { FileChange } from "../src/core/diff";
import { REFINEMENT_OFF, REFINING_REASON, RESUME_REASON, QUEUED_REASON, TO_REFINE_TIP, WAITING_RUN_TIP, type DriftCard, type TaskCard } from "../extension/src/webview/board/logic";
import type { RefinementView } from "../extension/src/protocol";
import type { AnnouncementView, DriftView, HistoryView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { boardDecisionCount } from "../src/core/board-decisions";
import { announcedCard, announcedGhosts, approveBlocker, blockedReason, buildBoard, clearableTasks, createsText, doneGroups, driftReworkBlocker, ghostExplanation, hideCleared, NO_MODELS, finishingBlocker, noteTime, runningFor, stoppedFollowingNotice, formatCounts, historyGroups, historyWhen, type HistoryPeriod, interleave, proposalBadges, proposalCard, resolveBlocker, summarizeChanges, summarizeFile, tagColour, taskCard, withdrawnNotice } from "../extension/src/webview/board/logic";
import { shopSnapshot, shopWithProposals } from "./diagram-fixture";
import { RUN_IN_PROGRESS, runBlocker } from "../src/core/design";
import { dismissBlocker } from "../extension/src/webview/dismiss";
import { namerOf } from "../src/core/card-names";

const proposal = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "0007",
  created: null,
  refining: false,
  title: "Returns",
  body: "",
  kind: "change",
  nonBlocking: false,
  prepared: false,
  resolves: [],
  requires: [],
  base: null,
  stale: [],
  unbased: [],
  errors: [],
  unfixable: [],
  creates: 0,
  tasks: [],
  removals: [],
  changes: [],
  machines: [],
  actors: [],
  areas: [],
  specs: EMPTY_SPECS,
  specsChange: { entries: [], notesBefore: null }, scope: [],
  ...over,
});
const drift = (over: Partial<DriftView> = {}): DriftView => ({ id: "0003", created: null, job: null, prepared: null, title: "Code refunds late", body: "line one\n\nline two\nline three", previous: [], origin: [], task: null, unifies: [], unifiedInto: null, refs: ["order/Shipped"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [], ...over });
const task = (over: Partial<TaskView> = {}): TaskView => ({ id: "0012", created: null, title: "Refunds", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTag: null, agent: false, progress: null, finished: null, unchanged: null, blockedBy: [], heldByDrift: false, file: "tasks/0012-refunds.md", images: [], ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], resolutionDrifts: [], drifts: [], unifiedDrifts: [], finishingDrifts: [], finishingProposals: [], finishingTasks: [], tasks: [], tasksSinceScan: 0, announcements: [], numbers: { proposal: {}, task: {}, drift: {} }, specs: EMPTY_SPECS, specsPresent: false, history: [], historyFaults: [], ...over });
const file = (change: FileChange["change"], details: string[], path = "checkout/order.md"): FileChange => ({ path, change, details });

test("groups the snapshot into card columns: Backlog holds the Proposals and the Drift cards in one creation order, Active the Tasks; there is no System Activities", () => {
  const board = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" }), proposal({ id: "0009", created: "2026-10-03T10:00:00.000Z" })],
      drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" })],
      tasks: [task({ id: "0001", column: "done" }), task({ id: "0002", column: "todo" }), task({ id: "0003", column: "doing" }), task({ id: "0004", column: "todo" })],
    }),
  );
  expect(board.map((c) => c.title)).toEqual(["Backlog", "Active", "Done"]);
  expect(board.map((c) => c.id)).toEqual(["backlog", "active", "done"]);
  expect(board[0]?.cards.map((c) => c.key)).toEqual(["proposal:0007", "drift:0003", "proposal:0009"]);
  expect(board[1]?.cards.map((c) => c.key)).toEqual(["task:0002", "task:0003", "task:0004"]);
  expect(board[2]?.cards.map((c) => c.key)).toEqual(["task:0001"]);
});

test("a handed-over resolution replaces only its listed open Drift cards", () => {
  const resolution = proposal({ id: "res", created: "2026-10-02T10:00:00.000Z", kind: "resolution", resolves: [{ drift: "0003", title: "Code refunds late", previous: [], unifies: [], decision: "Closed, nothing changes", note: null, notBlocking: [] }] });
  const board = buildBoard(snapshot({ proposals: [proposal({ id: "before", created: "2026-10-01T10:00:00.000Z" }), resolution], drifts: [drift({ id: "0003", created: "2026-09-30T10:00:00.000Z" }), drift({ id: "0004", created: "2026-10-03T10:00:00.000Z" })] }));
  const cards = board[0]!.cards;
  expect(cards[1]).toMatchObject({ kind: "proposal", resolution: true, heading: "Resolution Proposal res", resolves: [{ drift: "0003" }] });
  expect(board[0]!.cards.map((card) => card.key)).toEqual(["proposal:before", "proposal:res", "drift:0004"]);
  const returnedToDraft = buildBoard(snapshot({ proposals: [proposal({ id: "res", created: "2026-10-01T10:00:00.000Z", kind: "change" })], drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" }), drift({ id: "0004", created: "2026-10-03T10:00:00.000Z" })] }));
  expect(returnedToDraft[0]!.cards.map((card) => card.key)).toEqual(["proposal:res", "drift:0003", "drift:0004"]);
});

test("an empty snapshot gives three empty card columns with a hint each", () => {
  const board = buildBoard(snapshot());
  expect(board.every((c) => c.cards.length === 0 && c.hint.length > 0)).toBe(true);
  expect(board.map((c) => c.hint)).toEqual(["Nothing to decide", "Nothing active", "Nothing done yet"]);
});

test("keys differ across kinds that share an ID", () => {
  const board = buildBoard(snapshot({ proposals: [proposal({ id: "0003" })], drifts: [drift({ id: "0003" })], tasks: [task({ id: "0003" })] }));
  const keys = board.flatMap((c) => c.cards.map((card) => card.key));
  expect(new Set(keys).size).toBe(3);
});

test("formatCounts leaves out zeros", () => {
  expect(formatCounts(2, 1, 0)).toBe("+2 ~1");
  expect(formatCounts(0, 0, 3)).toBe("-3");
  expect(formatCounts(0, 0, 0)).toBe("");
});

test("file summaries count details by their marker, falling back to the kind of change", () => {
  expect(summarizeFile(file("modified", ["+ State Returned (final)", "+ Event RETURN", "~ State Shipped: description changed", "- Transition a → b"]))).toMatchObject({ added: 2, changed: 1, removed: 1, text: "+2 ~1 -1" });
  expect(summarizeFile(file("added", [])).text).toBe("new file");
  expect(summarizeFile(file("removed", [])).text).toBe("deleted file");
  expect(summarizeFile(file("modified", [])).text).toBe("modified");
});

test("change summaries list a few files and count the rest", () => {
  const files = ["a", "b", "c", "d", "e", "f"].map((n) => file("modified", ["+ x"], `${n}.md`));
  const summary = summarizeChanges(files);
  expect(summary.files.map((f) => f.path)).toEqual(["a.md", "b.md", "c.md", "d.md"]);
  expect(summary.more).toBe(2);
  expect(summarizeChanges(files.slice(0, 2))).toMatchObject({ more: 0 });
});

test("a Proposal can be approved only when it is neither stale, unbased nor invalid", () => {
  expect(approveBlocker(proposal())).toBeNull();
  expect(approveBlocker(proposal({ stale: ["a.md"] }))).toContain("Stale");
  expect(approveBlocker(proposal({ unbased: ["a.md"] }))).toContain("registered");
  expect(approveBlocker(proposal({ errors: [{ file: "a.md", line: 1, message: "bad" }] }))).toContain("invalid");
  const unfixable = proposal({ unfixable: ["The Model elements of Drift D3 no longer exist"] });
  expect(approveBlocker(unfixable)).toContain("Drift D3");
  expect(approveBlocker(unfixable)).toContain("Resolve Drifts");
  expect(approveBlocker(unfixable)).not.toContain("invalid");
  expect(proposalBadges(unfixable).map((b) => b.label)).toEqual(["unfixable"]);
});

test("Approve and Reject wait while the agent that delivered the Proposal is still finishing its turn", () => {
  const delivered = proposal({ id: "iwham416" });
  expect(finishingBlocker("iwham416", ["iwham416"])).toBe("The agent is still finishing");
  expect(finishingBlocker("iwham416", [])).toBeNull();
  const waiting = proposalCard(delivered, NUMBERS, new Map(), ["iwham416"]);
  expect(waiting.blocker).toBe("The agent is still finishing");
  expect(waiting.rejectBlocker).toBe("The agent is still finishing");
  const free = proposalCard(delivered, NUMBERS, new Map(), []);
  expect(free.blocker).toBeNull();
  expect(free.rejectBlocker).toBeNull();
  expect(waiting.reworkBlocker).toBe("The agent is still finishing");
  expect(free.reworkBlocker).toBeNull();
});

test("the arrow of Reject on a resolution adds the reasons of Resolve after the finishing one; an ordinary Proposal does not", () => {
  const resolution = proposal({ id: "iwham416", kind: "resolution" });
  const reasons = "A run is in progress";
  const card = proposalCard(resolution, NUMBERS, new Map(), ["iwham416"], NO_MODELS, undefined, reasons);
  expect(card.rejectBlocker).toBe("The agent is still finishing");
  expect(card.reworkBlocker).toBe("The agent is still finishing. A run is in progress");
  expect(proposalCard(resolution, NUMBERS, new Map(), [], NO_MODELS, undefined, reasons).reworkBlocker).toBe("A run is in progress");
  expect(proposalCard(proposal({ id: "iwham416" }), NUMBERS, new Map(), [], NO_MODELS, undefined, reasons).reworkBlocker).toBeNull();
  expect(driftReworkBlocker("An agent is resolving Drifts", "Drifts are being resolved")).toBe("An agent is resolving Drifts. Drifts are being resolved");
  expect(driftReworkBlocker(null, null)).toBeNull();
});

test("the model gear shows only on a Proposal that carries Tasks, and the chosen model is its name alone", () => {
  const carries = proposal({ id: "0007", tasks: [{ id: "0012", title: "Refunds", technical: false, refs: [] } as never] });
  const models = { proposals: { "0007": { name: "gpt-5" } } };
  const card = proposalCard(carries, NUMBERS, new Map(), [], models);
  expect(card.choosable).toBe(true);
  expect(card.model).toEqual({ name: "gpt-5" });
  const unchosen = proposalCard(carries, NUMBERS, new Map(), [], { proposals: { "0007": null } });
  expect(unchosen.choosable).toBe(true);
  expect(unchosen.model).toBeNull();
  const bare = proposalCard(proposal({ id: "0007" }), NUMBERS, new Map(), [], { proposals: {} });
  expect(bare.choosable).toBe(false);
  expect(bare.model).toBeNull();
});

test("names the Tasks a Proposal creates, singular and plural, none for zero", () => {
  expect(createsText(0)).toBeNull();
  expect(createsText(1)).toBe("Creates 1 Task");
  expect(createsText(3)).toBe("Creates 3 Tasks");
});

test("badges name each problem and list the files or the first messages in the tooltip", () => {
  expect(proposalBadges(proposal())).toEqual([]);
  const badges = proposalBadges(
    proposal({
      stale: ["checkout/order.md"],
      unbased: ["checkout/return.md"],
      errors: [1, 2, 3, 4, 5].map((n) => ({ file: "f.md", line: n, message: `problem ${n}` })),
    }),
  );
  expect(badges.map((b) => b.label)).toEqual(["stale", "invalid", "unregistered files"]);
  expect(badges[0]?.tooltip).toContain("checkout/order.md");
  expect(badges[2]?.tooltip).toContain("checkout/return.md");
  expect(badges[1]?.tooltip).toContain("f.md:1: problem 1");
  expect(badges[1]?.tooltip).toContain("f.md:3: problem 3");
  expect(badges[1]?.tooltip).not.toContain("problem 4");
  expect(badges[1]?.tooltip).toContain("and 2 more");
});

test("every written tooltip and disabling reason of a Proposal stays within about 160 characters, the list apart", () => {
  const LIMIT = 160;
  // A list tooltip counts its introductory sentence and any closing sentence, not the short list between them.
  const outside = (text: string) => {
    const lines = text.split("\n");
    return lines.length > 2 ? [lines[0], lines[lines.length - 1]].join(" ") : text;
  };
  const problems = proposal({ stale: ["a.md"], unbased: ["b.md"], errors: [{ file: "a.md", line: 1, message: "bad" }], unfixable: ["Drift D3 no longer exists"], kind: "import", nonBlocking: true });
  for (const badge of proposalBadges(problems)) expect(outside(badge.tooltip).length).toBeLessThanOrEqual(LIMIT);
  for (const part of [{ stale: ["a.md"] }, { unbased: ["a.md"] }, { errors: [{ file: "a.md", line: 1, message: "bad" }] }, { unfixable: ["Drift D3 no longer exists"] }]) {
    const text = approveBlocker(proposal(part));
    expect(text).not.toBeNull();
    expect(outside(text as string).length).toBeLessThanOrEqual(LIMIT);
  }
  const waiting = proposalCard(proposal({ id: "iwham416", stale: ["a.md"] }), NUMBERS, new Map(), ["iwham416"]);
  expect((waiting.blocker as string).length).toBeLessThanOrEqual(LIMIT);
});

/** A refinement picture with Refine All idle and nothing at work, changed by `patch`. */
const refinementOf = (patch: Partial<RefinementView> = {}): RefinementView => ({ enabled: true, running: [], queued: [], refineAll: { mode: "refine", count: 0, blockers: [] }, note: null, runInProgress: false, waiting: [], ...patch });

test("the refinement: off keeps the stale Proposal as it was; on, it refines before Approve", () => {
  const stale = proposal({ id: "0007", stale: ["a.md"] });
  const off = proposalCard(stale, NUMBERS);
  expect(off.blocker).toContain("Stale");
  expect(off.refine).toBeNull();
  expect(off.badges.map((b) => b.label)).toEqual(["stale"]);
  const on = refinementOf();
  const toRefine = proposalCard(stale, NUMBERS, new Map(), [], NO_MODELS, undefined, null, on);
  expect(toRefine.refine).toBe("to-refine");
  expect(toRefine.blocker).toBeNull();
  expect(toRefine.approveHint).toBe("Refine it on the current Model, then approve it");
  expect(toRefine.badges.map((b) => [b.label, b.tone, b.tooltip])).toEqual([["to refine", "primary", TO_REFINE_TIP]]);
  expect(toRefine.rejectBlocker).toBeNull();
  const requiring = proposalCard(proposal({ id: "0007", stale: ["a.md"], requires: [{ id: "0001", title: "Old", status: "open" }] } as Partial<ProposalView>), NUMBERS, new Map(), [], NO_MODELS, undefined, null, on);
  expect(requiring.blocker).not.toBeNull();
});

test("the refinement: running and queued Proposals wait, a stopped one resumes on Approve", () => {
  const stale = proposal({ id: "0007", stale: ["a.md"] });
  const running = proposalCard(stale, NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ running: ["0007"], note: "Reading the order" }), true);
  expect(running.refine).toBe("running");
  expect(running.blocker).toBe(REFINING_REASON);
  expect(running.rejectBlocker).toBe(REFINING_REASON);
  expect(running.refinePhase).toBe("Waiting for your answers");
  expect(running.refineNote).toBe("Reading the order");
  expect(running.badges[0]).toMatchObject({ label: "refining", tone: "info", tooltip: "The agent is refining this Proposal on the current Model" });
  const queued = proposalCard(proposal({ id: "0008", stale: ["a.md"] }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ running: ["0007"], queued: [{ proposal: "0008", waiting: "chain", on: "0007" }] }));
  expect(queued.refine).toBe("queued");
  expect(queued.blocker).toBe(QUEUED_REASON);
  expect(queued.badges[0]).toMatchObject({ label: "queued", tone: "info", tooltip: "Waiting for P1 to be refined first", accessibleName: "Waiting for P1 to be refined first" });
  const approval = proposalCard(proposal({ id: "0008", stale: ["a.md"] }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ queued: [{ proposal: "0008", waiting: "approval", on: "0007" }] }));
  expect(approval.badges[0]).toMatchObject({ label: "queued", tooltip: "Waiting for P1 to be approved first" });
  const slot = proposalCard(proposal({ id: "0008", stale: ["a.md"] }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ queued: [{ proposal: "0008", waiting: "slot" }] }));
  expect(slot.badges[0]).toMatchObject({ label: "queued", tooltip: "Waiting for a free refining slot" });
  expect(queued.refinePhase).toBeNull();
  expect(queued.refineNote).toBeNull();
  const stopped = proposalCard(proposal({ id: "0009", refining: true, stale: ["a.md"] }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf());
  expect(stopped.refine).toBe("stopped");
  expect(stopped.blocker).toBeNull();
  expect(stopped.rejectBlocker).toBe(RESUME_REASON);
  expect(stopped.badges[0]).toMatchObject({ label: "to refine", tone: "primary", tooltip: "Refining stopped before the hand-over. Approve resumes it." });
  expect(RESUME_REASON).toBe("Approve to resume refining first");
  expect(proposalCard(proposal({ refining: true }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, REFINEMENT_OFF).refine).toBeNull();
});

test("a Run of this window in progress blocks Approve with its reason, after the finishing reason", () => {
  const run = { runInProgress: true };
  expect(approveBlocker(proposal(), NUMBERS, true)).toBe(RUN_IN_PROGRESS);
  expect(approveBlocker(proposal({ stale: ["a.md"] }), NUMBERS, true)).toBe(`${RUN_IN_PROGRESS}. ${approveBlocker(proposal({ stale: ["a.md"] }))}`);
  const card = proposalCard(proposal({ id: "0007" }), NUMBERS, new Map(), ["0007"], NO_MODELS, undefined, null, refinementOf(run));
  expect(card.blocker).toBe(`The agent is still finishing. ${RUN_IN_PROGRESS}`);
  const refining = proposalCard(proposal({ id: "0007", stale: ["a.md"] }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ running: ["0007"], runInProgress: true }), true);
  expect(refining.blocker).toBe(`${RUN_IN_PROGRESS}. ${REFINING_REASON}`);
  expect(refining.rejectBlocker).toBe(REFINING_REASON);
});

test("a refined Proposal waiting for the Run carries a badge; Approve waits with the Run reason and Reject stays enabled", () => {
  const waiting = proposalCard(proposal({ id: "0007" }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf({ runInProgress: true, waiting: ["0007"] }));
  expect(waiting.badges[0]).toMatchObject({ label: "waiting for the run", tone: "info", tooltip: WAITING_RUN_TIP, accessibleName: "Refined; Trama approves it when the run in progress ends" });
  expect(waiting.blocker).toBe(RUN_IN_PROGRESS);
  expect(waiting.rejectBlocker).toBeNull();
  const after = proposalCard(proposal({ id: "0007" }), NUMBERS, new Map(), [], NO_MODELS, undefined, null, refinementOf());
  expect(after.badges.map((b) => b.label)).not.toContain("waiting for the run");
  expect(after.blocker).toBeNull();
});

const design = (id: string, column: TaskView["column"], proposal: string | null = "0007") => task({ id, column, proposal, proposalTag: proposal === null ? null : { text: "Returns", proposal, title: "Returns" } });
const cardsOf = (tasks: TaskView[]) => buildBoard(snapshot({ tasks })).map((c) => c.cards.map((card) => card.key));


test("a Task alone from its Proposal, and a Task with no Proposal, stay cards of their own in their own column, carrying their Proposal's tag, a Done one included (it has no View buttons)", () => {
  const board = buildBoard(snapshot({ tasks: [design("0001", "done", "0005"), design("0002", "doing", "0006"), design("0003", "todo"), task({ id: "0004", column: "todo" })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([[], ["task:0002", "task:0003", "task:0004"], ["task:0001"]]);
  expect(board[1]?.cards[1]).toMatchObject({ kind: "task", proposal: "0007", proposalTag: { text: "Returns" } });
  expect(board[1]?.cards[2]).toMatchObject({ kind: "task", proposal: null, proposalTag: null });
  expect(board[2]?.cards[0]).toMatchObject({ kind: "task", proposal: "0005", proposalTag: { text: "Returns" }, views: { diagram: false, requirements: false } });
});

test("a tag's colour is stable for its label and is one of the six Tailwind colours", () => {
  expect(tagColour("Proposal 0007")).toBe(tagColour("Proposal 0007"));
  expect(tagColour("Proposal 0007")).toMatch(/^(blue|green|amber|violet|cyan|red)$/);
  for (const label of ["Proposal 0007", "Proposal a1b2c3d4", "Refunds"]) expect(tagColour(label)).toMatch(/^(blue|green|amber|violet|cyan|red)$/);
});

test("Run all is unavailable while a Task is taken, when no Task is in To do, and when every Task in To do is blocked", () => {
  const drift: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }];
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004", driftTitle: "Refunds differ" }];
  const t = (id: string, column: TaskView["column"], agent = false, blockedBy: TaskView["blockedBy"] = []) => ({ id, column, agent, blockedBy });
  expect(runBlocker([t("0001", "todo"), t("0002", "doing")])).toBeNull();
  expect(runBlocker([t("0001", "done")])).toMatch(/No Task is in To do/);
  // A taken Task blocks even when To do has Tasks.
  expect(runBlocker([t("0001", "todo"), t("0002", "doing", true)])).toBe("An agent is working on Task 0002");
  expect(runBlocker([t("0001", "doing", true), t("0002", "doing", true)])).toBe("An agent is working on Tasks 0001, 0002. No Task is in To do");

  // Blocked Tasks outside To do do not matter; one free Task in To do keeps the button available.
  expect(runBlocker([t("0001", "todo", false, drift), t("0002", "todo")])).toBeNull();
  expect(runBlocker([t("0001", "doing", false, drift), t("0002", "todo")])).toBeNull();
  // Every Task in To do blocked: the tooltip names the Drift, or the fix Task, of the first of them.
  expect(runBlocker([t("0001", "doing"), t("0002", "todo", false, drift), t("0003", "todo", false, fix)])).toBe("All the Tasks in To do are blocked: Task 0002 is blocked by Drift 0003");
  expect(runBlocker([t("0001", "todo", false, fix), t("0002", "todo", false, drift)])).toBe("All the Tasks in To do are blocked: Task 0001 is waiting for Task 0009, which fixes its Drift");
  // When both reasons hold, both are given, the agent working first.
  expect(runBlocker([t("0001", "doing", true), t("0002", "todo", false, drift)])).toBe("An agent is working on Task 0001. All the Tasks in To do are blocked: Task 0002 is blocked by Drift 0003");
});

test("a blocked Task keeps its card in Active, in order, and sits under the Drift on the Drift's card unless an agent has taken it", () => {
  const blockedBy: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }];
  const board = buildBoard(snapshot({ drifts: [drift({ id: "0003" })], tasks: [task({ id: "0001", column: "todo", blockedBy }), task({ id: "0002", column: "todo", blockedBy, agent: true })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([["drift:0003"], ["task:0001", "task:0002"], []]);
  expect(board[1]?.cards[0]).toMatchObject({ kind: "task", blockedByDrifts: [{ id: "0003", key: "drift:0003" }] });
  expect(board[0]?.cards[0]).toMatchObject({ kind: "drift", blocked: [{ key: "task:0001" }] });
});

test("a Task waiting for a fix Task stays in Active with the fix Task, and no card stands for the wait", () => {
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004", driftTitle: "Refunds differ" }];
  const board = buildBoard(snapshot({ tasks: [task({ id: "0001", column: "todo", blockedBy: fix }), task({ id: "0009", column: "doing" })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([[], ["task:0001", "task:0009"], []]);
  expect(board[1]?.cards[0]).toMatchObject({ kind: "task", waitingFor: [{ id: "0009", column: "doing" }] });
});

test("the number of cards that wait for a decision counts the Backlog cards (Proposals and red Drift cards), not Active, or the Drifts a delivered resolution lists", () => {
  const resolution = proposal({ id: "res", created: "2026-10-02T10:00:00.000Z", kind: "resolution", resolves: [{ drift: "0005", title: "Code refunds late", previous: [], unifies: [], decision: "Closed, nothing changes", note: null, notBlocking: [] }] });
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004", driftTitle: "Refunds differ" }];
  const snap = snapshot({
    proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" }), resolution],
    drifts: [drift({ id: "0003", created: "2026-10-03T10:00:00.000Z" }), drift({ id: "0004", created: "2026-10-04T10:00:00.000Z" }), drift({ id: "0005" })],
    tasks: [task({ id: "0001", column: "todo", blockedBy: fix }), task({ id: "0002", column: "todo" }), task({ id: "0009", column: "doing" })],
  });
  const columns = buildBoard(snap);
  expect(columns[0]?.cards.map((card) => card.key)).toEqual(["proposal:0007", "proposal:res", "drift:0003", "drift:0004"]);
  expect(boardDecisionCount(snap)).toBe(4);
  expect(boardDecisionCount(snap)).toBe(columns[0]?.cards.length ?? 0);
});

const announcement = (over: Partial<AnnouncementView> = {}): AnnouncementView => ({ id: "abc123", kind: "proposal", title: "Refunds", phase: "preparing", notes: [], announced: "2026-01-01T10:00:00.000Z", ...over });

test("ghosts stand at the bottom of the column of their card, in the order announced, and the ones with no column are left out", () => {
  const placed = announcedGhosts(
    [
      announcement({ id: "d00001", kind: "drift", title: "A Drift" }),
      announcement({ id: "t00001", kind: "task", title: "A Task" }),
      announcement({ id: "c00001", kind: "check", title: "A Check", phase: "verifying" }),
      announcement({ id: "p00001", title: "A Proposal" }),
      announcement({ id: "r00001", kind: "resolve", title: "A Resolution" }),
      announcement({ id: "u00001", kind: "unify", title: "An Unification" }),
      announcement({ id: "k00001", kind: "comparison", title: "A Comparison", phase: null }),
      announcement({ id: "w00001", kind: "work", title: "An Import", phase: null }),
      announcement({ id: "s00001", kind: "scan", title: "A Scan", phase: "scanning" }),
    ],
    false,
  );
  expect(placed.map((g) => [g.card.title, g.column])).toEqual([["A Drift", "backlog"], ["A Task", "active"], ["A Proposal", "backlog"], ["A Resolution", "backlog"], ["An Unification", "backlog"]]);
  const column = ["real-1", "real-2"];
  const ghosts = (id: string) => placed.filter((g) => g.column === id).map((g) => ({ item: g.card.title, index: g.index }));
  expect(interleave(column, ghosts("backlog"))).toEqual(["real-1", "real-2", "A Drift", "A Proposal", "A Resolution", "An Unification"]);
  expect(interleave(column, ghosts("active"))).toEqual(["real-1", "real-2", "A Task"]);
});

test("interleaving puts each ghost before the real card at its index, keeping the order of ghosts that share one", () => {
  expect(interleave(["p1", "p2", "d1"], [{ item: "ghost-d", index: 3 }, { item: "ghost-p", index: 2 }, { item: "ghost-p2", index: 2 }])).toEqual(["p1", "p2", "ghost-p", "ghost-p2", "d1", "ghost-d"]);
  expect(interleave([], [{ item: "only", index: 0 }])).toEqual(["only"]);
});

test("a Drift ghost says Writing the Proposal once its Draft exists, and its name repeats it", () => {
  const card = announcedCard(announcement({ kind: "drift", title: "Refunds differ", phase: "writing-proposal" }), false);
  expect(card.phase).toBe("Writing the Proposal");
  expect(card.label).toContain("writing the proposal");
  const waiting = announcedCard(announcement({ kind: "drift", phase: "writing-proposal" }), true);
  expect(waiting.phase).toBe("Waiting for your answers");
  expect(waiting.label).toContain("waiting for your answers");
});

test("a ghost says Preparing, Writing, or that the agent waits for the answers while a question round is open, and its name tells kind, title and phase", () => {
  expect(announcedCard(announcement(), false).phase).toBe("Preparing");
  expect(announcedCard(announcement({ phase: "writing" }), false).phase).toBe("Writing");
  const waiting = announcedCard(announcement({ phase: "writing" }), true);
  expect(waiting.phase).toBe("Waiting for your answers");
  expect(waiting.label).toBe("Proposal the agent is creating, waiting for your answers: Refunds");
});

test("the notice of a withdrawn announcement names its kind and title", () => {
  expect(withdrawnNotice(announcement({ kind: "task", title: "Refunds" }))).toBe("The agent finished without delivering Task Refunds.");
});

test("a comparison ghost is named Compare, shows no phase, and its withdrawal notice says so", () => {
  const card = announcedCard(announcement({ kind: "comparison", title: "Comparing Refunds", phase: null }), false);
  expect(card).toMatchObject({ kindLabel: "Compare", phase: "", label: "Agent comparing the code: Comparing Refunds" });
  expect(withdrawnNotice(announcement({ kind: "comparison", title: "Comparing Refunds" }))).toBe("The agent finished without delivering Compare Comparing Refunds.");
});

test("a check shows its phase even while a question round is open", () => {
  const cards = [announcement({ id: "c00001", kind: "check", title: "Scan of Refunds", phase: "scanning" }), announcement({ id: "c00002", kind: "check", title: "Final check after all Tasks", phase: "verifying" })].map((a) => announcedCard(a, true));
  expect(cards.map((c) => [c.title, c.phase])).toEqual([["Scan of Refunds", "Scanning"], ["Final check after all Tasks", "Verifying (tests, lint, build)"]]);
  expect(cards[1]).toMatchObject({ kindLabel: "Check", label: "Agent checking the code: Final check after all Tasks, Verifying (tests, lint, build)" });
});

test("a check moved to History shows Updating History on its ghost", () => {
  expect(announcedCard(announcement({ kind: "check", title: "Final check after all Tasks", phase: "history" }), false)).toMatchObject({ phase: "Updating History", label: "Agent checking the code: Final check after all Tasks, Updating History" });
});

test("the notice of a withdrawn check says the agent stopped before finishing it", () => {
  expect(withdrawnNotice(announcement({ kind: "check", title: "Scan of the System", phase: "scanning" }))).toBe("The agent stopped before finishing Scan of the System.");
});

test("a Scan ghost is a check the agent makes, a Resolve ghost names its Drifts, and an Import ghost has no phase", () => {
  expect(announcedCard(announcement({ kind: "scan", title: "Scanning System", phase: "scanning" }), false).label).toBe("Agent checking the code: Scanning System, Scanning");
  expect(announcedCard(announcement({ kind: "resolve", title: "Resolving Drift Refunds", phase: "writing" }), false).label).toBe("Agent resolving Drifts: Resolving Drift Refunds, Writing");
  const imported = announcedCard(announcement({ kind: "work", title: "Importing from code", phase: null }), false);
  expect(imported.phase).toBe("");
  expect(imported.label).toBe("Agent importing the code");
});

test("a ghost shows the latest note and keeps the notes newest first with their time", () => {
  expect(announcedCard(announcement(), false)).toMatchObject({ note: null, notes: [] });
  const card = announcedCard(announcement({ notes: [{ at: "2026-01-01T10:00:00.000Z", text: "Reads the Model" }, { at: "2026-01-01T10:07:00.000Z", text: "Writes the Draft" }] }), false);
  expect(card.note).toBe("Writes the Draft");
  expect(card.notes.map((n) => n.text)).toEqual(["Writes the Draft", "Reads the Model"]);
  expect(card.notes.map((n) => n.time)).toEqual([noteTime("2026-01-01T10:07:00.000Z"), noteTime("2026-01-01T10:00:00.000Z")]);
  expect(noteTime("2026-01-01T10:07:00.000Z", "en-GB")).toMatch(/^\d{2}:\d{2}$/);
  expect(card.announced).toBe("2026-01-01T10:00:00.000Z");
});

test("the running time says less than a minute, minutes, or hours and minutes", () => {
  const at = "2026-01-01T10:00:00.000Z";
  const after = (ms: number) => new Date(Date.parse(at) + ms);
  expect(runningFor(at, after(59_000))).toBe("less than a minute");
  expect(runningFor(at, after(-5_000))).toBe("less than a minute");
  expect(runningFor(at, after(60_000))).toBe("1 min");
  expect(runningFor(at, after(59 * 60_000))).toBe("59 min");
  expect(runningFor(at, after(135 * 60_000))).toBe("2 h 15 min");
});

test("the explanation of a ghost depends on its kind and phase", () => {
  const explain = (over: Partial<AnnouncementView>, asking = false) => ghostExplanation(announcement(over), asking);
  expect(explain({})).toBe("The agent is exploring the Model and the code for this design; nothing is written yet.");
  expect(explain({ phase: "writing" })).toBe("The agent is writing this Proposal's Draft; it lands in Backlog when handed over.");
  expect(explain({ phase: "writing" }, true)).toBe("The agent is waiting for your answers to its questions.");
  expect(explain({ kind: "drift" })).toBe("The agent is preparing a Drift: a difference between the code and the Model that you will decide on.");
  expect(explain({ kind: "drift", phase: "writing-proposal" })).toBe("The agent is writing the Proposal this Drift will carry.");
  expect(explain({ kind: "task" })).toBe("The agent is preparing a Task; it lands in Active.");
  expect(explain({ kind: "resolve", phase: "writing" })).toBe("The agent is preparing the resolution of this Drift; it lands in Backlog for you to approve.");
  expect(explain({ kind: "unify", phase: "writing-proposal" })).toBe("The agent is merging these Drifts into one unified Drift.");
  expect(explain({ kind: "check", phase: "verifying" }, true)).toBe("The agent is running the final checks of the run: tests, lint and build.");
  expect(explain({ kind: "check", phase: "scanning" })).toBe("The agent is comparing the code with the Model and the Requirements.");
  expect(explain({ kind: "scan", phase: "scanning" })).toBe("The agent is comparing the code with the Model and the Requirements.");
  expect(explain({ kind: "check", phase: "history" })).toBe("The agent is writing the History entries of the finished Tasks.");
  expect(explain({ kind: "comparison", phase: null })).toBe("A comparison of one Machine with the code; its Tasks and Drifts arrive together.");
  expect(explain({ kind: "work", title: "Importing from code", phase: null })).toBe("The agent is describing the existing code as Proposals.");
});

test("the notice of a withdrawn Resolve Drifts ghost names a Proposal, and a withdrawn Scan says the check was stopped", () => {
  expect(withdrawnNotice(announcement({ kind: "resolve", title: "Resolving Drift Refunds" }))).toBe("The agent finished without delivering Proposal Resolving Drift Refunds.");
  expect(withdrawnNotice(announcement({ kind: "scan", title: "Scanning System", phase: "scanning" }))).toBe("The agent stopped before finishing Scanning System.");
});

test("ghosts are not cards: the columns and what awaits a decision ignore them", () => {
  const snap = snapshot({ announcements: [announcement(), announcement({ id: "t00001", kind: "task" })] });
  expect(buildBoard(snap).map((c) => c.cards.length)).toEqual([0, 0, 0]);
});

const NUMBERS = { proposal: { "0007": "P1" }, task: { "0012": "T3", "0013": "T4" }, drift: { "0003": "D2" } };

test("a resolution's card has one row per Drift, written by number, with the decision and its note; other Proposals have none", () => {
  const [card, plain] = buildBoard(
    snapshot({
      numbers: NUMBERS,
      proposals: [
        proposal({ id: "0007", kind: "resolution", resolves: [{ drift: "0003", title: "Late refunds", previous: [], unifies: [], decision: "Code fixed with option Fix the code", note: "do it today", notBlocking: [] }, { drift: "0044", title: "Old", previous: [], unifies: [], decision: "(already resolved)", note: null, notBlocking: [] }] }),
        proposal({ id: "0009" }),
      ],
    }),
  )[0]?.cards ?? [];
  expect(card).toMatchObject({
    resolves: [
      { drift: "0003", name: { text: "D2", isNumber: true }, title: "Late refunds", decision: "Code fixed with option Fix the code · do it today" },
      { drift: "0044", name: { text: "0044", isNumber: false }, title: "Old", decision: "(already resolved)" },
    ],
  });
  expect(plain).toMatchObject({ resolves: [] });
});

test("an open resolution's rows list its Drifts, and no card is made for those Drifts", () => {
  const cards = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007", kind: "resolution", resolves: [{ drift: "0003", title: "Late refunds", previous: [], unifies: [], decision: "Code fixed with option Fix the code", note: null, notBlocking: [] }, { drift: "0044", title: "Old", previous: [], unifies: [], decision: "(already resolved)", note: null, notBlocking: [] }] })],
      drifts: [drift({ id: "0003" })],
    }),
  )[0]?.cards ?? [];
  expect(cards.map((card) => card.key)).toEqual(["proposal:0007"]);
  expect(cards[0]).toMatchObject({ resolves: [{ drift: "0003" }, { drift: "0044" }] });
});

test("a live card is written by its short number; a Done Task keeps the number it still has, or its identity", () => {
  const board = buildBoard(
    snapshot({
      numbers: NUMBERS,
      proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" })],
      drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" })],
      tasks: [task({ id: "0012" }), task({ id: "0099", column: "done" })],
    }),
  );
  const [backlog, active, done] = board;
  expect(backlog?.cards.map((c) => (c.kind === "proposal" || c.kind === "drift" ? { heading: c.heading, name: c.name } : null))).toEqual([
    { heading: "Proposal P1", name: { text: "P1", isNumber: true } },
    { heading: "Drift D2", name: { text: "D2", isNumber: true } },
  ]);
  expect(active?.cards[0]).toMatchObject({ kind: "task", id: "0012", name: { text: "T3", isNumber: true } });
  expect(done?.cards[0]).toMatchObject({ kind: "task", id: "0099", name: { text: "0099", isNumber: false } });
  expect(board).toHaveLength(3);
});

test("blockers, requirements and the reasons that name them use the numbers, while their targets stay the identities", () => {
  const blockedBy: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }, { kind: "fix", task: "0013", title: "Fix it", drift: "0003", driftTitle: "Refunds differ" }];
  const card = taskCard(task({ blockedBy }), NUMBERS, null, undefined, [task({ id: "0013", column: "doing", agent: true })]);
  expect(card.blockedByDrifts).toEqual([{ id: "0003", key: "drift:0003", name: { text: "D2", isNumber: true }, title: "Refunds differ" }]);
  expect(card.waitingFor).toMatchObject([{ id: "0013", key: "task:0013", name: { text: "T4", isNumber: true }, title: "Fix it", column: "doing", agent: true, drift: { id: "0003", name: { text: "D2", isNumber: true }, title: "Refunds differ" } }]);
  expect(blockedReason(card.blockedByDrifts, card.waitingFor)).toBe("Blocked by Drift D2. Waiting for Task T4");
  expect(blockedReason([], [])).toBeNull();

  const requires: ProposalView["requires"] = [{ id: "0007", title: "Base", status: "open" }];
  const base = { stale: [], unbased: [], errors: [], unfixable: [], requires, nonBlocking: false };
  expect(proposalBadges({ ...base, kind: "change" }, NUMBERS)[0]).toMatchObject({ label: "requires P1", tooltip: 'Proposal P1 "Base" is not approved yet' });
  expect(approveBlocker(base, NUMBERS)).toContain('Proposal P1 "Base" is not approved yet');
});

test("the run blockers name the Tasks and the Drift by number", () => {
  const name = namerOf(NUMBERS);
  const blocked = { id: "0012", column: "todo" as const, agent: false, blockedBy: [{ kind: "drift" as const, drift: "0003" }] };
  expect(runBlocker([blocked], name)).toBe("All the Tasks in To do are blocked: Task T3 is blocked by Drift D2");
  expect(runBlocker([{ ...blocked, agent: true }], name)).toBe("An agent is working on Task T3. All the Tasks in To do are blocked: Task T3 is blocked by Drift D2");
});

describe("the History column", () => {
  // Local times, so the days are the developer's whatever the machine's zone.
  const now = new Date(2026, 9, 6, 15, 0);
  const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
  const entry = (id: string, updated: string, created = updated): HistoryView => ({ id, title: `Entry ${id}`, summary: "", body: "", created, updated, file: `history/${id}.md`, tasks: [] });
  // Creation order: the array order.
  const entries: HistoryView[] = [entry("0001", at(6, 10)), entry("0002", at(5, 20)), entry("0003", at(3, 9)), entry("0004", at(6, 10)), entry("0005", at(6, 12)), entry("0008", at(4, 8)), entry("0009", at(-4, 8))];
  const shown = (period: HistoryPeriod, list: HistoryView[] = entries) => historyGroups(list, period, now, "en-US").map((g) => [g.heading, g.entries.map((e) => e.id)]);

  test("puts the latest updated first, by local day; ties go to the newer entry", () => {
    expect(shown("week")).toEqual([
      ["Today · 3", ["0005", "0004", "0001"]],
      ["Yesterday · 1", ["0002"]],
      ["October 4, 2026 · 1", ["0008"]],
      ["October 3, 2026 · 1", ["0003"]],
    ]);
  });

  test("the period lets through today, the last 7 or 30 local days, or all", () => {
    expect(shown("today")).toEqual([["Today · 3", ["0005", "0004", "0001"]]]);
    expect(shown("month").map(([heading]) => heading)).toEqual(["Today · 3", "Yesterday · 1", "October 4, 2026 · 1", "October 3, 2026 · 1", "September 26, 2026 · 1"]);
    expect(shown("all", [...entries, entry("0010", new Date(2025, 2, 1, 9).toISOString())]).at(-1)).toEqual(["March 1, 2025 · 1", ["0010"]]);
  });

  test("Last 7 days starts at midnight six local days ago, and a period with no entries leaves no group", () => {
    const edge = [entry("0001", new Date(2026, 8, 30).toISOString()), entry("0002", new Date(2026, 8, 29, 23, 59).toISOString())];
    expect(shown("week", edge)).toEqual([["September 30, 2026 · 1", ["0001"]]]);
    expect(historyGroups([entry("0003", at(-4, 8))], "week", now, "en-US")).toEqual([]);
  });

  test("entries with no valid date are left out, and an empty History has no groups", () => {
    expect(shown("all", [entry("0011", "")])).toEqual([]);
    expect(shown("all", [])).toEqual([]);
  });
  test("an entry shows the clock alone in Today and Yesterday, the date and the time before; the tooltip gives both in full", () => {
    const when = (day: number) => historyWhen(new Date(2026, 9, day, 9, 5).toISOString(), now, "en-US");
    expect(when(6).text).toContain("9:05");
    expect(when(5).text).not.toContain("October");
    expect(when(4).text).toContain("October 4, 2026");
    expect(when(4).title).toContain("9:05:00");
  });
});

test("a Drift the running resolution works on carries Resolving; its Resolve shows its own reason", () => {
  const resolve = { blocker: null, drifts: { "0003": "An agent is resolving this Drift", "0004": null }, resolving: ["0003"] };
  const cards = buildBoard(snapshot({ drifts: [drift({ id: "0003" }), drift({ id: "0004", created: "2025-01-02" })] }), resolve).flatMap((c) => c.cards).filter((c): c is DriftCard => c.kind === "drift");
  expect(cards.find((c) => c.id === "0003")?.resolving).toBe(true);
  expect(cards.find((c) => c.id === "0003")?.resolveBlocker).toBe("An agent is resolving this Drift");
  expect(cards.find((c) => c.id === "0004")?.resolving).toBe(false);
  expect(cards.find((c) => c.id === "0004")?.resolveBlocker).toBeNull();
});

test("a Drift and a Task the agent is still finishing wait: Resolve, Dismiss Drift and Run say so first, and free ones carry no reason", () => {
  const resolve = { blocker: "Drifts are being resolved", drifts: { "0003": null, "0004": null }, resolving: [] };
  const columns = buildBoard(snapshot({ drifts: [drift({ id: "0003" }), drift({ id: "0004", created: "2025-01-02" })], tasks: [task({ id: "0012" }), task({ id: "0013", title: "Other" })], finishingDrifts: ["0003"], finishingTasks: ["0012"] }), resolve);
  const cards = columns.flatMap((c) => c.cards);
  const waiting = cards.find((c): c is DriftCard => c.kind === "drift" && c.id === "0003");
  expect([waiting?.resolveBlocker, waiting?.dismissBlocker]).toEqual(["The agent is still finishing", "The agent is still finishing. An agent is resolving Drifts"]);
  const free = cards.find((c): c is DriftCard => c.kind === "drift" && c.id === "0004");
  expect([free?.resolveBlocker, free?.dismissBlocker]).toEqual([null, "An agent is resolving Drifts"]);
  expect(cards.find((c): c is TaskCard => c.kind === "task" && c.id === "0012")?.finishing).toBe("The agent is still finishing");
  expect(cards.find((c): c is TaskCard => c.kind === "task" && c.id === "0013")?.finishing).toBeNull();
});

test("a Drift card's Resolve carries its own reasons, in order, and no mode note", () => {
  const reasons = { "0003": "An agent is resolving this Drift. A run is in progress. Proposal P4 resolving Drifts awaits a decision" };
  expect(resolveBlocker("0003", ["0003"], { drifts: reasons })).toBe(`The agent is still finishing. ${reasons["0003"]}`);
  expect(resolveBlocker("0003", [], { drifts: reasons })).toBe(reasons["0003"]);
  expect(resolveBlocker("0003", [], { drifts: {} })).toBeNull();
  const [card] = buildBoard(snapshot({ drifts: [drift({ id: "0003" })], finishingDrifts: ["0003"] }), { blocker: "Drifts are being resolved", drifts: { "0003": "Drifts are being resolved" }, resolving: [] }).flatMap((c) => c.cards).filter((c): c is DriftCard => c.kind === "drift");
  expect(card?.resolveBlocker).toBe("The agent is still finishing. Drifts are being resolved");
  expect(card).not.toHaveProperty("resolveNote");
  expect(card?.resolving).toBe(false);
});

test("the Resolving badge names an agent working on a Drift, and the Drift stays a card in Blocked", () => {
  const board = buildBoard(snapshot({ drifts: [drift({ id: "0003" })] }), { blocker: null, drifts: {}, resolving: ["0003"] });
  const card = board.flatMap((c) => c.cards).find((c): c is DriftCard => c.kind === "drift");
  expect(card?.resolving).toBe(true);
});

test("a Drift's card names the Tasks it leaves free by number, and leaves out those that no longer exist", () => {
  const free = drift({ id: "0003", notBlocking: [{ task: "0012", title: "Refunds", reason: "Only the wording." }, { task: "0013", title: null, reason: "Gone." }] });
  const numbers = { proposal: {}, task: { "0012": "T2" }, drift: {} };
  const [card] = buildBoard(snapshot({ drifts: [free], numbers }))[0]?.cards ?? [];
  expect(card).toMatchObject({ kind: "drift", notBlocking: [{ name: { text: "T2", isNumber: true }, reason: "Only the wording." }] });
});

test("a card has a View button only for the tab that would show a step of its focus, on the current picture", () => {
  const shop = shopSnapshot();
  const tasks = [task({ id: "named", refs: ["order/Paid"] }), task({ id: "bare", refs: [] }), task({ id: "gone", refs: ["order/Nope"] }), task({ id: "finished", refs: ["order/Paid"], column: "done" })];
  const active = buildBoard({ ...shop, tasks })[1]?.cards ?? [];
  const views = Object.fromEntries(active.flatMap((c) => (c.kind === "task" ? [[c.id, c.views]] : [])));
  expect(views.named?.diagram).toBe(true);
  expect(views.bare).toEqual({ diagram: false, requirements: false });
  expect(views.gone).toEqual({ diagram: false, requirements: false });
  expect(views.finished).toBeUndefined();

  const withProposal = shopWithProposals();
  const [card] = buildBoard(withProposal)[0]?.cards ?? [];
  expect(card).toMatchObject({ kind: "proposal", views: { diagram: true } });
});

test("the notice of a job the run control stopped following names the job and why", () => {
  expect(stoppedFollowingNotice("T3", "the terminal is gone")).toBe("Trama stopped following T3: the terminal is gone.");
});

test("the Run, Resolve and Dismiss reasons and the Blocked and Waiting lists stay within 160 characters even with many names", () => {
  const drifts = [1, 2, 3, 4, 5].map((n) => ({ id: `d${n}`, key: `k${n}`, name: { text: `D${n}`, isNumber: true }, title: "t" }));
  const waits = [1, 2, 3, 4, 5].map((n) => ({ name: { text: `T${n}`, isNumber: true } }));
  const text = blockedReason(drifts as never, waits as never) as string;
  expect(text).toContain("and 2 more");
  expect(`Drifts are being resolved. A run is in progress. ${text}. The agent is still finishing`.length).toBeLessThanOrEqual(160);
  const required = [1, 2, 3, 4, 5].map((n) => ({ id: `p${n}`, title: "Base", status: "open" as const }));
  const approve = approveBlocker(proposal({ requires: required as never }), NUMBERS) as string;
  expect(approve.split("\n")[0]?.length).toBeLessThanOrEqual(160);
  expect(approve).toContain("and 2 more");
  expect(approve.split("\n").length).toBe(5);
});

test("the worst Resolve and Dismiss disabling reasons of a Drift card stay within about 160 characters", () => {
  const host = "Drifts are being resolved. A run is in progress. Proposal P12 resolving Drifts awaits a decision";
  const resolve = resolveBlocker("d1", ["d1"], { drifts: { d1: host } });
  const dismiss = dismissBlocker("d1", ["d1"], resolve, ["d1"]);
  expect((resolve as string).length).toBeLessThanOrEqual(160);
  expect((dismiss as string).length).toBeLessThanOrEqual(160);
});

test("a note at local midnight reads 00:05, never 24:05", () => {
  const midnight = new Date(2026, 0, 2, 0, 5).toISOString();
  expect(noteTime(midnight, "en-GB")).toBe("00:05");
});

describe("the Done column", () => {
  const done = (id: string, finished: string | null, over: Partial<TaskView> = {}) => task({ id, column: "done", finished, created: `2026-09-${id.slice(-2)}T10:00:00.000Z`, ...over });
  const keys = (tasks: TaskView[], drifts: DriftView[] = []) => buildBoard(snapshot({ tasks, drifts }))[2]?.cards.map((card) => card.key);

  test("lists every Done Task, the latest arrival first, and those with no instant after all the others in reverse creation order", () => {
    expect(
      keys([
        done("0010", null),
        done("0011", "2026-10-01T10:00:00.000Z"),
        done("0012", "2026-10-03T10:00:00.000Z"),
        done("0013", null),
        done("0014", "2026-10-02T10:00:00.000Z"),
        done("0015", "2026-10-03T10:00:00.000Z"),
        task({ id: "0016", column: "todo" }),
      ]),
    ).toEqual(["task:0015", "task:0012", "task:0014", "task:0011", "task:0013", "task:0010"]);
  });

  test("a Task closed without changes is a card too, and carries its note", () => {
    const [card] = buildBoard(snapshot({ tasks: [done("0010", "2026-10-01T10:00:00.000Z", { unchanged: "Already done" })] }))[2]?.cards ?? [];
    expect(card).toMatchObject({ kind: "task", unchanged: "Already done", finished: "2026-10-01T10:00:00.000Z", keptBy: [] });
  });

  test("a Task an open Drift names as origin or as the Task that fixes its code is kept while that Drift is open, the Drifts in creation order", () => {
    const numbers = { proposal: {}, task: {}, drift: { "0003": "D3", "0007": "D7" } };
    const board = buildBoard(
      snapshot({
        numbers,
        tasks: [done("0010", "2026-10-01T10:00:00.000Z"), done("0011", "2026-10-01T11:00:00.000Z"), done("0012", "2026-10-01T12:00:00.000Z")],
        drifts: [drift({ id: "0007", created: "2026-10-02T10:00:00.000Z", origin: ["0010"], task: "0011" }), drift({ id: "0003", created: "2026-10-01T10:00:00.000Z", origin: ["0010"] })],
      }),
    );
    const names = (id: string) => board[2]?.cards.find((card) => card.id === id && card.kind === "task");
    expect(names("0010")).toMatchObject({ keptBy: [{ text: "D3" }, { text: "D7" }] });
    expect(names("0011")).toMatchObject({ keptBy: [{ text: "D7" }] });
    expect(names("0012")).toMatchObject({ keptBy: [] });
    // Once no open Drift names the Task, the badge is gone.
    expect(buildBoard(snapshot({ numbers, tasks: [done("0010", null)], drifts: [] }))[2]?.cards[0]).toMatchObject({ keptBy: [] });
  });

  test("doneGroups groups by local day of the end with the headings of the History, and Tasks with no instant go last under Earlier", () => {
    const now = new Date(2026, 9, 20, 15, 0);
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();
    const cards = buildBoard(snapshot({ tasks: [done("0010", at(20, 9)), done("0011", at(20, 8)), done("0012", at(19, 12)), done("0013", at(3, 12)), done("0014", null)] }))[2]?.cards ?? [];
    const groups = doneGroups(cards, now, "en-US");
    expect(groups.map((g) => g.heading)).toEqual(["Today · 2", "Yesterday · 1", "October 3, 2026 · 1", "Earlier · 1"]);
    expect(groups.map((g) => g.cards.map((c) => c.id))).toEqual([["0010", "0011"], ["0012"], ["0013"], ["0014"]]);
    expect(doneGroups([], now)).toEqual([]);
  });

  describe("Clear hides the cards it deletes until the host is done", () => {
    const now = new Date(2026, 9, 20, 15, 0);
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();
    const snap = () =>
      snapshot({
        numbers: { proposal: {}, task: {}, drift: { "0003": "D3" } },
        tasks: [done("0010", at(20, 9)), done("0011", at(19, 12)), done("0012", at(3, 12)), task({ id: "0099", column: "todo" })],
        drifts: [drift({ id: "0003", origin: ["0011"] })],
      });

    test("the Tasks Clear deletes are the cards of Done without the kept badge", () => {
      const columns = buildBoard(snap());
      expect(clearableTasks(columns[2]?.cards ?? [])).toEqual(["0010", "0012"]);
      expect(clearableTasks([])).toEqual([]);
    });

    test("after the click the hidden cards are out of Done and a kept card is never hidden; the other columns do not change", () => {
      const columns = buildBoard(snap());
      const hidden = hideCleared(columns, clearableTasks(columns[2]?.cards ?? []));
      expect(hidden[2]?.cards.map((c) => c.id)).toEqual(["0011"]);
      expect(hidden[0]).toBe(columns[0]!);
      expect(hidden[1]).toBe(columns[1]!);
      expect(hideCleared(columns, ["0011"])[2]?.cards.map((c) => c.id)).toEqual(["0010", "0011", "0012"]);
    });

    test("the number, the groups by day and the state of Clear follow the cards left", () => {
      const columns = buildBoard(snap());
      const left = hideCleared(columns, ["0010", "0011", "0012"])[2]?.cards ?? [];
      expect(left.length).toBe(1);
      expect(doneGroups(left, now, "en-US").map((g) => [g.heading, g.cards.map((c) => c.id)])).toEqual([["Yesterday · 1", ["0011"]]]);
      expect(clearableTasks(left)).toEqual([]);
      // Nothing left at all: no group, so the column shows its hint.
      const none = hideCleared(buildBoard(snapshot({ tasks: [done("0010", at(20, 9))] })), ["0010"])[2]?.cards ?? [];
      expect(none).toEqual([]);
      expect(doneGroups(none, now)).toEqual([]);
      expect(clearableTasks(none)).toEqual([]);
    });

    test("once the host is done nothing is hidden: the cards of a refused or failed Clear are back in their place, and the deleted ones are not in the picture", () => {
      const columns = buildBoard(snap());
      const ids = clearableTasks(columns[2]?.cards ?? []);
      expect(hideCleared(columns, [])[2]?.cards.map((c) => c.id)).toEqual(["0010", "0011", "0012"]);
      // Failure after the first Task: 0010 is gone from the picture, 0012 comes back, and the order stays the one of the column.
      const after = buildBoard(snapshot({ ...snap(), tasks: [done("0011", at(19, 12)), done("0012", at(3, 12))] }));
      expect(ids).toEqual(["0010", "0012"]);
      expect(hideCleared(after, []).map((c) => c.cards.map((card) => card.id))).toEqual([["0003"], [], ["0011", "0012"]]);
    });
  });
});
