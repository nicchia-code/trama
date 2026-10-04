import { expect, test } from "bun:test";
import type { FileChange } from "../src/core/diff";
import type { AnnouncementView, DriftView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { announcedCard, announcedGhosts, approveBlocker, blockBadge, buildBoard, dropTarget, formatCounts, interleave, neighbour, proposalBadges, summarizeChanges, summarizeFile, withdrawnNotice } from "../extension/src/webview/board/logic";
import { runBlocker } from "../src/core/design";

const proposal = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "0007",
  title: "Returns",
  body: "",
  kind: "change",
  requires: [],
  base: null,
  stale: [],
  unbased: [],
  errors: [],
  changes: [],
  machines: [],
  actors: [],
  areas: [],
  ...over,
});
const drift = (over: Partial<DriftView> = {}): DriftView => ({ id: "0003", title: "Code refunds late", body: "line one\n\nline two\nline three", refs: ["order/Shipped"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, ...over });
const task = (over: Partial<TaskView> = {}): TaskView => ({ id: "0012", title: "Refunds", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTitle: null, agent: false, blockedBy: [], file: "tasks/0012-refunds.md", ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], drifts: [], tasks: [], announcements: [], ...over });
const file = (change: FileChange["change"], details: string[], path = "checkout/order.md"): FileChange => ({ path, change, details });

test("groups the snapshot into four columns, Proposals before Drifts in To decide", () => {
  const board = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007" }), proposal({ id: "0009" })],
      drifts: [drift({ id: "0003" })],
      tasks: [task({ id: "0001", column: "done" }), task({ id: "0002", column: "todo" }), task({ id: "0003", column: "doing" }), task({ id: "0004", column: "todo" })],
    }),
  );
  expect(board.map((c) => c.title)).toEqual(["To decide", "To do", "In progress", "Done"]);
  expect(board.map((c) => c.id)).toEqual(["decide", "todo", "doing", "done"]);
  expect(board[0]?.cards.map((c) => c.key)).toEqual(["proposal:0007", "proposal:0009", "drift:0003"]);
  expect(board[1]?.cards.map((c) => c.key)).toEqual(["task:0002", "task:0004"]);
  expect(board[2]?.cards.map((c) => c.key)).toEqual(["task:0003"]);
  expect(board[3]?.cards.map((c) => c.key)).toEqual(["task:0001"]);
});

test("an empty snapshot gives four empty columns with a hint each", () => {
  const board = buildBoard(snapshot());
  expect(board.every((c) => c.cards.length === 0 && c.hint.length > 0)).toBe(true);
  expect(board[0]?.hint).toBe("Nothing to decide");
});

test("keys differ across kinds that share an ID", () => {
  const board = buildBoard(snapshot({ proposals: [proposal({ id: "0003" })], drifts: [drift({ id: "0003" })], tasks: [task({ id: "0003" })] }));
  const keys = board.flatMap((c) => c.cards.map((card) => card.key));
  expect(new Set(keys).size).toBe(3);
});

test("neighbour moves along To do, In progress, Done and stops at the ends", () => {
  expect(neighbour("todo", "left")).toBeNull();
  expect(neighbour("todo", "right")).toBe("doing");
  expect(neighbour("doing", "left")).toBe("todo");
  expect(neighbour("doing", "right")).toBe("done");
  expect(neighbour("done", "left")).toBe("doing");
  expect(neighbour("done", "right")).toBeNull();
});

test("task cards carry their neighbours", () => {
  const cards = buildBoard(snapshot({ tasks: [task({ column: "doing" })] }))[2]?.cards;
  expect(cards?.[0]).toMatchObject({ kind: "task", left: "todo", right: "done" });
});

test("a drop is refused on To decide and on the card's own column", () => {
  expect(dropTarget("todo", "decide")).toBeNull();
  expect(dropTarget("todo", "todo")).toBeNull();
  expect(dropTarget("todo", "doing")).toBe("doing");
  expect(dropTarget("done", "todo")).toBe("todo");
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

const design = (id: string, column: TaskView["column"], proposal: string | null = "0007") => task({ id, column, proposal, proposalTitle: proposal === null ? null : "Returns" });
const cardsOf = (tasks: TaskView[]) => buildBoard(snapshot({ tasks })).map((c) => c.cards.map((card) => card.key));

test("the Tasks of one design become one card, named after the Proposal, with the others left alone", () => {
  const board = buildBoard(snapshot({ tasks: [design("0001", "todo"), task({ id: "0002" }), design("0003", "todo"), design("0004", "todo")] }));
  expect(board[1]?.cards.map((c) => c.key)).toEqual(["design:0007", "task:0002"]);
  expect(board[1]?.cards[0]).toMatchObject({ kind: "design", id: "0007", title: "Returns", done: 0 });
  expect(board[1]?.cards[0]?.kind === "design" && board[1].cards[0].tasks.map((t) => t.id)).toEqual(["0001", "0003", "0004"]);
});

test("a design of one Task, and Tasks that carry no Proposal, stay plain cards", () => {
  expect(cardsOf([design("0001", "todo"), task({ id: "0002" }), task({ id: "0003" })])[1]).toEqual(["task:0001", "task:0002", "task:0003"]);
});

test("the design card stands in the column its Tasks add up to", () => {
  const where = (columns: TaskView["column"][]) => {
    const board = buildBoard(snapshot({ tasks: columns.map((c, i) => design(`000${i + 1}`, c)) }));
    return board.find((c) => c.cards.some((card) => card.key === "design:0007"))?.id;
  };
  expect(where(["todo", "todo"])).toBe("todo");
  expect(where(["done", "done"])).toBe("done");
  expect(where(["todo", "doing"])).toBe("doing");
  expect(where(["done", "doing"])).toBe("doing");
  expect(where(["todo", "done"])).toBe("doing");
});

test("the card counts finished Tasks and keeps each Task's own column", () => {
  const card = buildBoard(snapshot({ tasks: [design("0001", "done"), design("0002", "doing"), design("0003", "todo")] }))[2]?.cards[0];
  expect(card).toMatchObject({ kind: "design", done: 1, column: "doing" });
  expect(card?.kind === "design" && card.tasks.map((t) => [t.id, t.column, t.left, t.right])).toEqual([
    ["0001", "done", "doing", null],
    ["0002", "doing", "todo", "done"],
    ["0003", "todo", null, "doing"],
  ]);
});

test("two designs give two cards; a design whose Proposal is gone is named after its ID", () => {
  const tasks = [design("0001", "todo", "0007"), design("0002", "todo", "0008"), design("0003", "todo", "0007"), design("0004", "todo", "0008")];
  expect(cardsOf(tasks)[1]).toEqual(["design:0007", "design:0008"]);
  const orphan = buildBoard(snapshot({ tasks: [task({ id: "0001", proposal: "0009" }), task({ id: "0002", proposal: "0009" })] }))[1]?.cards[0];
  expect(orphan).toMatchObject({ kind: "design", title: "Proposal 0009" });
});

test("Run all To do and Run this design are unavailable while a Task is taken, when none is in To do, and when every one in To do is blocked", () => {
  const drift: TaskView["blockedBy"] = [{ kind: "drift", drift: "0003", title: "Refunds differ" }];
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" }];
  const t = (id: string, column: TaskView["column"], agent = false, blockedBy: TaskView["blockedBy"] = []) => ({ id, column, agent, blockedBy });
  expect(runBlocker([t("0001", "todo"), t("0002", "doing")], "all")).toBeNull();
  expect(runBlocker([t("0001", "done")], "all")).toMatch(/No Task is in To do/);
  // A taken Task blocks even when To do has Tasks, also one that belongs to a design card.
  expect(runBlocker([t("0001", "todo"), t("0002", "doing", true)], "all")).toBe("An agent is working on Task 0002");
  expect(runBlocker([t("0001", "doing", true), t("0002", "doing", true)], "all")).toBe("An agent is working on Tasks 0001, 0002");

  expect(runBlocker([t("0001", "todo"), t("0002", "doing")], "design")).toBeNull();
  expect(runBlocker([t("0001", "todo"), t("0002", "doing", true)], "design")).toBe("An agent is working on Task 0002");
  expect(runBlocker([t("0001", "done"), t("0002", "doing")], "design")).toMatch(/No Task of this design is in To do/);

  // Blocked Tasks outside To do do not matter; one free Task in To do keeps the button available.
  expect(runBlocker([t("0001", "todo", false, drift), t("0002", "todo")], "all")).toBeNull();
  expect(runBlocker([t("0001", "doing", false, drift), t("0002", "todo")], "design")).toBeNull();
  // Every Task in To do blocked: the tooltip names the Drift, or the fix Task, of the first of them.
  expect(runBlocker([t("0001", "doing"), t("0002", "todo", false, drift), t("0003", "todo", false, fix)], "all")).toBe("All the Tasks in To do are blocked: Task 0002 is blocked by Drift 0003");
  expect(runBlocker([t("0001", "todo", false, fix), t("0002", "todo", false, drift)], "design")).toBe("All the Tasks of this design in To do are blocked: Task 0001 is waiting for Task 0009, which fixes its Drift");
  // When both reasons hold, the agent working comes first.
  expect(runBlocker([t("0001", "doing", true), t("0002", "todo", false, drift)], "all")).toBe("An agent is working on Task 0001");
});

test("a blocked Task, alone or inside a design, gets one badge per blocker that says why and where it leads", () => {
  const blockedBy: TaskView["blockedBy"] = [
    { kind: "drift", drift: "0003", title: "Refunds differ" },
    { kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" },
  ];
  const card = buildBoard(snapshot({ tasks: [task({ blockedBy })] }))[1]?.cards[0];
  expect(card?.kind === "task" && card.blocks).toEqual([
    { label: "blocked 0003", tooltip: "Blocked by Drift 0003: Refunds differ. Show it on the diagram.", target: { kind: "drift", id: "0003" } },
    { label: "waiting 0009", tooltip: "Waiting for Task 0009: Fix refunds, which fixes the code for Drift 0004. Go to its card.", target: { kind: "task", id: "0009" } },
  ]);
  const inDesign = buildBoard(snapshot({ tasks: [design("0001", "todo"), { ...design("0002", "todo"), blockedBy: [blockedBy[0] as TaskView["blockedBy"][number]] }] }))[1]?.cards[0];
  expect(inDesign?.kind === "design" && inDesign.tasks.map((t) => t.blocks.map((b) => b.label))).toEqual([[], ["blocked 0003"]]);
  expect(blockBadge(blockedBy[0] as TaskView["blockedBy"][number]).target.kind).toBe("drift");
  // Blocking disables nothing: the move arrows follow the column only.
  expect(card?.kind === "task" && [card.left, card.right]).toEqual([null, "doing"]);
});

const announcement = (over: Partial<AnnouncementView> = {}): AnnouncementView => ({ id: "abc123", kind: "proposal", title: "Refunds", phase: "preparing", ...over });

test("announced ghosts stand in the column their card will land in, after the real cards of their kind, Proposals before Drifts", () => {
  const columns = buildBoard(
    snapshot({
      proposals: [proposal({ id: "0007" })],
      drifts: [drift({ id: "0003" })],
      tasks: [task({ id: "0001", column: "todo" }), task({ id: "0002", column: "done" })],
    }),
  );
  const placed = announcedGhosts(
    columns,
    [announcement({ id: "d00001", kind: "drift", title: "A Drift" }), announcement({ id: "t00001", kind: "task", title: "A Task" }), announcement({ id: "p00001", title: "A Proposal" })],
    false,
  );
  expect(placed.decide.map((g) => [g.card.title, g.index])).toEqual([["A Proposal", 1], ["A Drift", 2]]);
  expect(placed.todo.map((g) => [g.card.title, g.index])).toEqual([["A Task", 1]]);
  expect(placed.doing).toEqual([]);
  expect(placed.done).toEqual([]);
});

test("interleaving puts each ghost before the real card at its index, keeping the order of ghosts that share one", () => {
  expect(interleave(["p1", "p2", "d1"], [{ item: "ghost-d", index: 3 }, { item: "ghost-p", index: 2 }, { item: "ghost-p2", index: 2 }])).toEqual(["p1", "p2", "ghost-p", "ghost-p2", "d1", "ghost-d"]);
  expect(interleave([], [{ item: "only", index: 0 }])).toEqual(["only"]);
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

test("ghosts are not cards: the columns and what awaits a decision ignore them", () => {
  const snap = snapshot({ announcements: [announcement(), announcement({ id: "t00001", kind: "task" })] });
  expect(buildBoard(snap).map((c) => c.cards.length)).toEqual([0, 0, 0, 0]);
});
