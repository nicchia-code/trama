import { EMPTY_SPECS } from "../src/core/specs";
import { describe, expect, test } from "bun:test";
import type { FileChange } from "../src/core/diff";
import type { DriftCard, TaskCard } from "../extension/src/webview/board/logic";
import type { AnnouncementView, DriftView, HistoryView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { announcedCard, announcedGhosts, approveBlocker, blockBadge, boardDecisionCount, buildBoard, createsText, finishingBlocker, formatCounts, historyGroups, historyWhen, type HistoryPeriod, interleave, proposalBadges, proposalCard, summarizeChanges, summarizeFile, tagColour, withdrawnNotice } from "../extension/src/webview/board/logic";
import { shopSnapshot, shopWithProposals } from "./diagram-fixture";
import { runBlocker } from "../src/core/design";
import { namerOf } from "../src/core/card-names";

const proposal = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "0007",
  created: null,
  title: "Returns",
  body: "",
  kind: "change",
  automatic: false,
  nonBlocking: false,
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
const drift = (over: Partial<DriftView> = {}): DriftView => ({ id: "0003", created: null, title: "Code refunds late", body: "line one\n\nline two\nline three", critical: false, previous: null, refs: ["order/Shipped"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, proposalTitle: null, proposalChanges: null, closedUnchanged: null, notBlocking: [], ...over });
const task = (over: Partial<TaskView> = {}): TaskView => ({ id: "0012", created: null, title: "Refunds", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTag: null, agent: false, finished: null, unchanged: null, blockedBy: [], file: "tasks/0012-refunds.md", ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], resolutionDrifts: [], drifts: [], finishingDrifts: [], finishingProposals: [], finishingTasks: [], tasks: [], tasksSinceScan: 0, announcements: [], numbers: { proposal: {}, task: {}, drift: {} }, specs: EMPTY_SPECS, specsPresent: false, history: [], historyFaults: [], ...over });
const file = (change: FileChange["change"], details: string[], path = "checkout/order.md"): FileChange => ({ path, change, details });

test("groups the snapshot into three columns: Backlog holds the Proposals in creation order, Drifts sit in Blocked", () => {
  const board = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" }), proposal({ id: "0009", created: "2026-10-03T10:00:00.000Z" })],
      drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" })],
      tasks: [task({ id: "0001", column: "done" }), task({ id: "0002", column: "todo" }), task({ id: "0003", column: "doing" }), task({ id: "0004", column: "todo" })],
    }),
  );
  expect(board.map((c) => c.title)).toEqual(["Backlog", "Active", "Blocked"]);
  expect(board.map((c) => c.id)).toEqual(["backlog", "active", "blocked"]);
  expect(board[0]?.cards.map((c) => c.key)).toEqual(["proposal:0007", "proposal:0009"]);
  expect(board[1]?.cards.map((c) => c.key)).toEqual(["task:0002", "task:0003", "task:0004"]);
  expect(board[2]?.cards.map((c) => c.key)).toEqual(["drift:0003"]);
});

test("a handed-over resolution replaces only its listed open Drift cards", () => {
  const resolution = proposal({ id: "res", created: "2026-10-02T10:00:00.000Z", kind: "resolution", resolves: [{ drift: "0003", title: "Code refunds late", critical: false, previous: null, decision: "Closed, nothing changes", note: null, notBlocking: [] }] });
  const board = buildBoard(snapshot({ proposals: [proposal({ id: "before", created: "2026-10-01T10:00:00.000Z" }), resolution], drifts: [drift({ id: "0003", created: "2026-09-30T10:00:00.000Z" }), drift({ id: "0004", created: "2026-10-03T10:00:00.000Z" })] }));
  const cards = board[0]!.cards;
  expect(cards.map((card) => card.key)).toEqual(["proposal:before", "proposal:res"]);
  expect(cards[1]).toMatchObject({ kind: "proposal", resolution: true, heading: "Resolution Proposal res", resolves: [{ drift: "0003" }] });
  expect(board[2]!.cards.map((card) => card.key)).toEqual(["drift:0004"]);
  const returnedToDraft = buildBoard(snapshot({ proposals: [proposal({ id: "res", created: "2026-10-01T10:00:00.000Z", kind: "change" })], drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" }), drift({ id: "0004", created: "2026-10-03T10:00:00.000Z" })] }));
  expect(returnedToDraft[0]!.cards.map((card) => card.key)).toEqual(["proposal:res"]);
  expect(returnedToDraft[2]!.cards.map((card) => card.key)).toEqual(["drift:0003", "drift:0004"]);
});

test("an empty snapshot gives four empty columns with a hint each", () => {
  const board = buildBoard(snapshot());
  expect(board.every((c) => c.cards.length === 0 && c.hint.length > 0)).toBe(true);
  expect(board[0]?.hint).toBe("No proposals");
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
  const waiting = proposalCard(delivered, NUMBERS, () => null, new Map(), ["iwham416"]);
  expect(waiting.blocker).toBe("The agent is still finishing");
  expect(waiting.rejectBlocker).toBe("The agent is still finishing");
  const free = proposalCard(delivered, NUMBERS, () => null, new Map(), []);
  expect(free.blocker).toBeNull();
  expect(free.rejectBlocker).toBeNull();
});

test("the model gear shows only on a Proposal that carries Tasks, and the chosen model is badged, struck when chosen for another agent", () => {
  const carries = proposal({ id: "0007", tasks: [{ id: "0012", title: "Refunds", technical: false, refs: [] } as never] });
  const models = { agent: "omp" as const, proposals: { "0007": { name: "gpt-5", agent: "cursor" as const, applies: false } } };
  const card = proposalCard(carries, NUMBERS, () => null, new Map(), [], models);
  expect(card.choosable).toBe(true);
  expect(card.model).toEqual({ name: "gpt-5", agent: "cursor", applies: false });
  const unchosen = proposalCard(carries, NUMBERS, () => null, new Map(), [], { agent: "omp", proposals: { "0007": null } });
  expect(unchosen.choosable).toBe(true);
  expect(unchosen.model).toBeNull();
  const bare = proposalCard(proposal({ id: "0007" }), NUMBERS, () => null, new Map(), [], { agent: "omp", proposals: {} });
  expect(bare.choosable).toBe(false);
  expect(bare.model).toBeNull();
});

test("names the Tasks a Proposal creates, singular and plural, none for zero", () => {
  expect(createsText(0)).toBeNull();
  expect(createsText(1)).toBe("Creates 1 Task");
  expect(createsText(3)).toBe("Creates 3 Tasks");
});

test("an automatic resolution is marked delegated and its approval controls stay usable", () => {
  const automatic = { ...proposal({ kind: "resolution" }), automatic: true };
  expect(proposalBadges(automatic).map((b) => b.label)).toEqual(["delegated"]);
  expect(approveBlocker(automatic)).toBeNull();
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

const design = (id: string, column: TaskView["column"], proposal: string | null = "0007") => task({ id, column, proposal, proposalTag: proposal === null ? null : { text: "Returns", proposal, title: "Returns" } });
const cardsOf = (tasks: TaskView[]) => buildBoard(snapshot({ tasks })).map((c) => c.cards.map((card) => card.key));


test("a Task alone from its Proposal, and a Task with no Proposal, stay cards of their own in their own column, carrying their Proposal's tag; a Done one has none", () => {
  const board = buildBoard(snapshot({ tasks: [design("0001", "done", "0005"), design("0002", "doing", "0006"), design("0003", "todo"), task({ id: "0004", column: "todo" })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([[], ["task:0002", "task:0003", "task:0004"], []]);
  expect(board[1]?.cards[1]).toMatchObject({ kind: "task", proposal: "0007", proposalTag: { text: "Returns" } });
  expect(board[1]?.cards[2]).toMatchObject({ kind: "task", proposal: null, proposalTag: null });
});

test("a tag's colour is stable for its label and is one of the six Tailwind colours", () => {
  expect(tagColour("Proposal 0007")).toBe(tagColour("Proposal 0007"));
  expect(tagColour("Proposal 0007")).toMatch(/^(blue|green|amber|fuchsia|cyan|red)$/);
  for (const label of ["Proposal 0007", "Proposal a1b2c3d4", "Refunds"]) expect(tagColour(label)).toMatch(/^(blue|green|amber|fuchsia|cyan|red)$/);
});

test("Run all is unavailable while a Task is taken, when no Task is in To do, and when every Task in To do is blocked", () => {
  const drift: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }];
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" }];
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

test("a blocked Task sits under the Drift it waits for, not in a column, unless an agent has taken it", () => {
  const blockedBy: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }];
  const board = buildBoard(snapshot({ drifts: [drift({ id: "0003" })], tasks: [task({ id: "0001", column: "todo", blockedBy }), task({ id: "0002", column: "todo", blockedBy, agent: true })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([[], ["task:0002"], ["drift:0003"]]);
  expect(board[2]?.cards[0]).toMatchObject({ kind: "drift", blocked: [{ key: "task:0001" }] });
});

test("a Task waiting for a fix Task sits under a waiting card in Blocked, and the fix Task stays in Active", () => {
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" }];
  const board = buildBoard(snapshot({ tasks: [task({ id: "0001", column: "todo", blockedBy: fix }), task({ id: "0009", column: "doing" })] }));
  expect(board.map((c) => c.cards.map((card) => card.key))).toEqual([[], ["task:0009"], ["waiting:0009"]]);
  expect(board[2]?.cards[0]).toMatchObject({ kind: "waiting", task: { key: "task:0009" }, waiting: [{ key: "task:0001" }] });
});

test("the Board tab counts the Backlog cards and the Drift cards of Blocked, not Active, waiting cards, or the Drifts a delivered resolution lists", () => {
  const resolution = proposal({ id: "res", created: "2026-10-02T10:00:00.000Z", kind: "resolution", resolves: [{ drift: "0005", title: "Code refunds late", critical: false, previous: null, decision: "Closed, nothing changes", note: null, notBlocking: [] }] });
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" }];
  const columns = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" }), resolution],
      drifts: [drift({ id: "0003" }), drift({ id: "0004" }), drift({ id: "0005" })],
      tasks: [task({ id: "0001", column: "todo", blockedBy: fix }), task({ id: "0002", column: "todo" }), task({ id: "0009", column: "doing" })],
    }),
  );
  expect(columns[2]?.cards.map((card) => card.key)).toEqual(["drift:0003", "drift:0004", "waiting:0009"]);
  expect(boardDecisionCount(columns)).toBe(4);
});

const announcement = (over: Partial<AnnouncementView> = {}): AnnouncementView => ({ id: "abc123", kind: "proposal", title: "Refunds", phase: "preparing", ...over });

test("announced ghosts all stand in Active after its real cards, in the order announced, whatever their kind", () => {
  const columns = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007" })],
      drifts: [drift({ id: "0003" })],
      tasks: [task({ id: "0001", column: "doing" }), task({ id: "0002", column: "todo" }), task({ id: "0004", column: "done" })],
    }),
  );
  const placed = announcedGhosts(
    columns,
    [announcement({ id: "d00001", kind: "drift", title: "A Drift" }), announcement({ id: "t00001", kind: "task", title: "A Task" }), announcement({ id: "p00001", title: "A Proposal" })],
    false,
  );
  expect(placed.map((g) => [g.card.title, g.index])).toEqual([
    ["A Drift", 2],
    ["A Task", 2],
    ["A Proposal", 2],
  ]);
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

test("a check stands in Active after the real cards, in the order announced, and shows its phase even while a question round is open", () => {
  const columns = buildBoard(snapshot({ tasks: [task({ id: "0001", column: "doing" })] }));
  const placed = announcedGhosts(columns, [announcement({ id: "c00001", kind: "check", title: "Scan of Refunds", phase: "scanning" }), announcement({ id: "c00002", kind: "check", title: "Final check after all Tasks", phase: "verifying" })], true);
  expect(placed.map((g) => [g.card.title, g.index, g.card.phase])).toEqual([["Scan of Refunds", 1, "Scanning"], ["Final check after all Tasks", 1, "Verifying (tests, lint, build)"]]);
  expect(placed[1]?.card).toMatchObject({ kindLabel: "Check", label: "Agent checking the code: Final check after all Tasks, Verifying (tests, lint, build)" });
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
        proposal({ id: "0007", kind: "resolution", resolves: [{ drift: "0003", title: "Late refunds", critical: false, previous: null, decision: "Code fixed with option Fix the code", note: "do it today", notBlocking: [] }, { drift: "0044", title: "Old", critical: false, previous: null, decision: "(already resolved)", note: null, notBlocking: [] }] }),
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

test("an open resolution's row carries the autopilot failure of its Drift, and no card is made for that Drift", () => {
  const failures = [{ job: "j1", title: "Drift 0003: Not authorized any more", drift: "0003", reason: "Not authorized any more" }];
  const cards = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007", kind: "resolution", resolves: [{ drift: "0003", title: "Late refunds", critical: false, previous: null, decision: "Code fixed with option Fix the code", note: null, notBlocking: [] }, { drift: "0044", title: "Old", critical: false, previous: null, decision: "(already resolved)", note: null, notBlocking: [] }] })],
      drifts: [drift({ id: "0003" })],
    }),
    failures,
  )[0]?.cards ?? [];
  expect(cards.map((card) => card.key)).toEqual(["proposal:0007"]);
  expect(cards[0]).toMatchObject({ resolves: [{ drift: "0003", autopilotFailed: "Not authorized any more" }, { drift: "0044", autopilotFailed: null }] });
});

test("a live card is written by its short number; a Done Task has no card on the Board", () => {
  const board = buildBoard(
    snapshot({
      numbers: NUMBERS,
      proposals: [proposal({ id: "0007", created: "2026-10-01T10:00:00.000Z" })],
      drifts: [drift({ id: "0003", created: "2026-10-02T10:00:00.000Z" })],
      tasks: [task({ id: "0012" }), task({ id: "0099", column: "done" })],
    }),
  );
  const [backlog, active, blocked] = board;
  expect(backlog?.cards.map((c) => (c.kind === "proposal" || c.kind === "drift" ? { heading: c.heading, name: c.name } : null))).toEqual([{ heading: "Proposal P1", name: { text: "P1", isNumber: true } }]);
  expect(blocked?.cards.map((c) => (c.kind === "proposal" || c.kind === "drift" ? { heading: c.heading, name: c.name } : null))).toEqual([{ heading: "Drift D2", name: { text: "D2", isNumber: true } }]);
  expect(active?.cards[0]).toMatchObject({ kind: "task", id: "0012", name: { text: "T3", isNumber: true } });
  expect(board).toHaveLength(3);
});

test("blockers, requirements and the reasons that name them use the numbers, while their targets stay the identities", () => {
  const drifted = blockBadge({ kind: "drift", drift: "0003", title: "Refunds differ" }, NUMBERS);
  expect(drifted).toMatchObject({ label: "blocked D2", target: { kind: "diagram", drift: "0003" } });
  expect(drifted.tooltip).toContain("Blocked by Drift D2: Refunds differ");
  const waiting = blockBadge({ kind: "fix", task: "0013", title: "Fix it", drift: "0003" }, NUMBERS);
  expect(waiting).toMatchObject({ label: "waiting T4", target: { kind: "card", key: "task:0013" } });
  expect(waiting.tooltip).toContain("Waiting for Task T4: Fix it, which fixes the code for Drift D2");

  const requires: ProposalView["requires"] = [{ id: "0007", title: "Base", status: "open" }];
  const base = { stale: [], unbased: [], errors: [], unfixable: [], requires, automatic: false, nonBlocking: false };
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

test("a Drift the running resolution works on carries Resolving and the mode; its Resolve shows its own reason", () => {
  const resolve = { blocker: null, drifts: { "0003": "An agent is resolving this Drift", "0004": null }, resolving: ["0003"], note: "Drift autopilot is off: Resolve Drifts uses the manual flow." };
  const cards = buildBoard(snapshot({ drifts: [drift({ id: "0003" }), drift({ id: "0004", created: "2025-01-02" })] }), [], resolve).flatMap((c) => c.cards).filter((c): c is DriftCard => c.kind === "drift");
  expect(cards.find((c) => c.id === "0003")?.resolving).toBe(true);
  expect(cards.find((c) => c.id === "0003")?.resolveBlocker).toBe("An agent is resolving this Drift");
  expect(cards.find((c) => c.id === "0004")?.resolving).toBe(false);
  expect(cards.find((c) => c.id === "0004")?.resolveBlocker).toBeNull();
  expect(cards.find((c) => c.id === "0004")?.resolveNote).toBe(resolve.note);
});

test("a Drift and a Task the agent is still finishing wait: Resolve, Dismiss Drift and Run say so first, and free ones carry no reason", () => {
  const resolve = { blocker: "Drifts are being resolved", drifts: { "0003": null, "0004": null }, resolving: [], note: "" };
  const columns = buildBoard(snapshot({ drifts: [drift({ id: "0003" }), drift({ id: "0004", created: "2025-01-02" })], tasks: [task({ id: "0012" }), task({ id: "0013", title: "Other" })], finishingDrifts: ["0003"], finishingTasks: ["0012"] }), [], resolve);
  const cards = columns.flatMap((c) => c.cards);
  const waiting = cards.find((c): c is DriftCard => c.kind === "drift" && c.id === "0003");
  expect([waiting?.resolveBlocker, waiting?.dismissBlocker]).toEqual(["The agent is still finishing", "The agent is still finishing. An agent is resolving Drifts"]);
  const free = cards.find((c): c is DriftCard => c.kind === "drift" && c.id === "0004");
  expect([free?.resolveBlocker, free?.dismissBlocker]).toEqual([null, "An agent is resolving Drifts"]);
  expect(cards.find((c): c is TaskCard => c.kind === "task" && c.id === "0012")?.finishing).toBe("The agent is still finishing");
  expect(cards.find((c): c is TaskCard => c.kind === "task" && c.id === "0013")?.finishing).toBeNull();
});

test("Resolve all is unavailable with its reason, and the mode is the same tooltip text on every card", () => {
  const note = "Drift autopilot is on (yolo): it approves and fixes all eligible Drifts, critical ones too.";
  const cards = buildBoard(snapshot({ drifts: [drift({ id: "0003" })] }), [], { blocker: "Drifts are being resolved", drifts: {}, resolving: [], note }).flatMap((c) => c.cards).filter((c): c is DriftCard => c.kind === "drift");
  expect(cards[0]?.resolveNote).toBe(note);
  expect(cards[0]?.resolving).toBe(false);
});

test("the Resolving badge names an agent working on a Drift, and the Drift stays a card in Blocked", () => {
  const board = buildBoard(snapshot({ drifts: [drift({ id: "0003" })] }), [], { blocker: null, drifts: {}, resolving: ["0003"], note: "" });
  const card = board.flatMap((c) => c.cards).find((c): c is DriftCard => c.kind === "drift");
  expect(card?.resolving).toBe(true);
});

test("a Drift's card names the Tasks it leaves free by number, and leaves out those that no longer exist", () => {
  const free = drift({ id: "0003", notBlocking: [{ task: "0012", title: "Refunds", reason: "Only the wording." }, { task: "0013", title: null, reason: "Gone." }] });
  const numbers = { proposal: {}, task: { "0012": "T2" }, drift: {} };
  const [card] = buildBoard(snapshot({ drifts: [free], numbers }))[2]?.cards ?? [];
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
