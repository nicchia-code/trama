import { describe, expect, test } from "bun:test";
import type { FileChange } from "../src/core/diff";
import type { AnnouncementView, DriftView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { announcedCard, announcedGhosts, approveBlocker, blockBadge, buildBoard, doneGroups, formatCounts, interleave, proposalBadges, summarizeChanges, summarizeFile, withdrawnNotice, worktreeCards } from "../extension/src/webview/board/logic";
import { runBlocker } from "../src/core/design";
import { namerOf } from "../src/core/card-names";

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
const drift = (over: Partial<DriftView> = {}): DriftView => ({ id: "0003", title: "Code refunds late", body: "line one\n\nline two\nline three", refs: ["order/Shipped"], proposal: null, sides: null, options: [], option: null, note: null, requirementsOnly: false, proposalBlock: null, worktree: null, ...over });
const task = (over: Partial<TaskView> = {}): TaskView => ({ id: "0012", title: "Refunds", body: "", column: "todo", technical: false, refs: [], drift: null, proposal: null, proposalTitle: null, agent: false, finished: null, blockedBy: [], file: "tasks/0012-refunds.md", worktree: null, ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], areas: [], proposals: [], inWorktree: [], worktreeProposals: [], drifts: [], tasks: [], announcements: [], multiBranch: false, numbers: { proposal: {}, task: {}, drift: {} }, ...over });
const file = (change: FileChange["change"], details: string[], path = "checkout/order.md"): FileChange => ({ path, change, details });

test("a Proposal in a worktree is its own group and is not a card to decide; Remove from round is only before the merge", () => {
  const cards = worktreeCards(snapshot({ inWorktree: [{ id: "0008", title: "Ship", removable: true }, { id: "0009", title: "Wait", removable: false }] }));
  expect(cards).toEqual([
    { kind: "worktree", key: "worktree:0008", id: "0008", name: { text: "0008", isNumber: false }, heading: "Proposal 0008", title: "Ship", removable: true },
    { kind: "worktree", key: "worktree:0009", id: "0009", name: { text: "0009", isNumber: false }, heading: "Proposal 0009", title: "Wait", removable: false },
  ]);
  expect(buildBoard(snapshot({ inWorktree: [{ id: "0008", title: "Ship", removable: true }] }))[0]?.cards).toEqual([]);
});

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
  expect(card?.kind === "design" && card.tasks.map((t) => [t.id, t.column])).toEqual([
    ["0001", "done"],
    ["0002", "doing"],
    ["0003", "todo"],
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
    { label: "blocked 0003", tooltip: "Blocked by Drift 0003: Refunds differ. Show it on the diagram.", target: { kind: "diagram", drift: "0003" } },
    { label: "waiting 0009", tooltip: "Waiting for Task 0009: Fix refunds, which fixes the code for Drift 0004. Go to its card.", target: { kind: "card", key: "task:0009" } },
  ]);
  const inDesign = buildBoard(snapshot({ tasks: [design("0001", "todo"), { ...design("0002", "todo"), blockedBy: [blockedBy[0] as TaskView["blockedBy"][number]] }] }))[1]?.cards[0];
  expect(inDesign?.kind === "design" && inDesign.tasks.map((t) => t.blocks.map((b) => b.label))).toEqual([[], ["blocked 0003"]]);
  // In a worktree the Diagram does not draw the Drift: both badges lead to the cards of that worktree.
  const away = buildBoard(snapshot({ tasks: [task({ blockedBy, worktree: "p1" }), task({ id: "0009", worktree: "p1" })] }))[1]?.cards ?? [];
  expect(away[0]?.kind === "task" && away[0].blocks.map((b) => [b.tooltip.endsWith("Go to its card."), b.target])).toEqual([
    [true, { kind: "card", key: "worktree:p1:drift:0003" }],
    [true, { kind: "card", key: "worktree:p1:task:0009" }],
  ]);
  expect(away[1]?.key).toBe("worktree:p1:task:0009");
});

test("a badge that leads to a Task shown as a row of a design card leads to that design card, opened on the row", () => {
  const fix: TaskView["blockedBy"] = [{ kind: "fix", task: "0009", title: "Fix refunds", drift: "0004" }];
  // The fix Task sits in the design of the blocked Task: the badge leads to the design card, on its row.
  const inDesign = buildBoard(snapshot({ tasks: [{ ...design("0001", "todo"), blockedBy: fix }, design("0009", "doing")] }))[2]?.cards[0];
  expect(inDesign?.kind === "design" && inDesign.tasks[0]?.blocks.map((b) => b.target)).toEqual([{ kind: "card", key: "design:0007", row: "task:0009" }]);
  // A blocked Task on its own card, waiting for a fix Task inside a design card, leads there too.
  const alone = buildBoard(snapshot({ tasks: [task({ id: "0002", blockedBy: fix }), design("0009", "todo"), design("0010", "todo")] }))[1]?.cards ?? [];
  expect(alone.map((c) => c.key)).toEqual(["task:0002", "design:0007"]);
  expect(alone[0]?.kind === "task" && alone[0].blocks.map((b) => b.target)).toEqual([{ kind: "card", key: "design:0007", row: "task:0009" }]);
  // In a worktree too.
  const away = buildBoard(snapshot({ tasks: [{ ...design("0001", "todo"), worktree: "p1", blockedBy: fix }, { ...design("0009", "todo"), worktree: "p1" }] }))[1]?.cards[0];
  expect(away?.kind === "design" && away.tasks[0]?.blocks.map((b) => b.target)).toEqual([{ kind: "card", key: "design:0007", row: "worktree:p1:task:0009" }]);
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

test("a rework announcement keeps the Proposal's identity in its file and shows its number while it is live", () => {
  const rework = announcement({ title: "Rework of Proposal 0007" });
  expect(announcedCard(rework, false, NUMBERS)).toMatchObject({ title: "Rework of Proposal P1", label: "Proposal the agent is creating, preparing: Rework of Proposal P1" });
  expect(withdrawnNotice(rework, NUMBERS)).toBe("The agent finished without delivering Proposal Rework of Proposal P1.");
  expect(announcedCard(rework, false).title).toBe("Rework of Proposal 0007");
});

test("ghosts are not cards: the columns and what awaits a decision ignore them", () => {
  const snap = snapshot({ announcements: [announcement(), announcement({ id: "t00001", kind: "task" })] });
  expect(buildBoard(snap).map((c) => c.cards.length)).toEqual([0, 0, 0, 0]);
});

const NUMBERS = { proposal: { "0007": "P1" }, task: { "0012": "T3", "0013": "T4" }, drift: { "0003": "D2" } };

test("a live card is written by its short number, a closed one by its identity, never both", () => {
  const board = buildBoard(
    snapshot({
      numbers: NUMBERS,
      proposals: [proposal({ id: "0007" })],
      drifts: [drift({ id: "0003", proposal: "0007" })],
      tasks: [task({ id: "0012" }), task({ id: "0099", column: "done" })],
    }),
  );
  const [decide, todo, , done] = board;
  expect(decide?.cards.map((c) => (c.kind === "proposal" || c.kind === "drift" ? { heading: c.heading, name: c.name } : null))).toEqual([
    { heading: "Proposal P1", name: { text: "P1", isNumber: true } },
    { heading: "Drift D2", name: { text: "D2", isNumber: true } },
  ]);
  expect(decide?.cards[1]).toMatchObject({ proposalName: "P1" });
  expect(todo?.cards[0]).toMatchObject({ kind: "task", id: "0012", name: { text: "T3", isNumber: true } });
  expect(done?.cards[0]).toMatchObject({ kind: "task", id: "0099", name: { text: "0099", isNumber: false } });
});

test("blockers, requirements and the reasons that name them use the numbers, while their targets stay the identities", () => {
  const drifted = blockBadge({ kind: "drift", drift: "0003", title: "Refunds differ" }, NUMBERS);
  expect(drifted).toMatchObject({ label: "blocked D2", target: { kind: "diagram", drift: "0003" } });
  expect(drifted.tooltip).toContain("Blocked by Drift D2: Refunds differ");
  const waiting = blockBadge({ kind: "fix", task: "0013", title: "Fix it", drift: "0003" }, NUMBERS);
  expect(waiting).toMatchObject({ label: "waiting T4", target: { kind: "card", key: "task:0013" } });
  expect(waiting.tooltip).toContain("Waiting for Task T4: Fix it, which fixes the code for Drift D2");

  const requires: ProposalView["requires"] = [{ id: "0007", title: "Base", status: "open" }];
  const base = { stale: [], unbased: [], errors: [], requires };
  expect(proposalBadges({ ...base, kind: "change" }, NUMBERS)[0]).toMatchObject({ label: "requires P1", tooltip: 'Proposal P1 "Base" is not approved yet' });
  expect(approveBlocker(base, NUMBERS)).toContain('Proposal P1 "Base" is not approved yet');
});

test("the run blockers name the Tasks and the Drift by number", () => {
  const name = namerOf(NUMBERS);
  const blocked = { id: "0012", column: "todo" as const, agent: false, blockedBy: [{ kind: "drift" as const, drift: "0003" }] };
  expect(runBlocker([blocked], "all", name)).toBe("All the Tasks in To do are blocked: Task T3 is blocked by Drift D2");
  expect(runBlocker([{ ...blocked, agent: true }], "all", name)).toBe("An agent is working on Task T3");
});

describe("the Done column", () => {
  // Local times, so the days are the developer's whatever the machine's zone.
  const now = new Date(2026, 9, 6, 15, 0);
  const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
  const done = (id: string, finished: string | null, proposal: string | null = null) => task({ id, column: "done", finished, proposal, proposalTitle: proposal && "Returns" });
  // Creation order: the design card stands where its first Task (0003) stands.
  const column = buildBoard(
    snapshot({
      tasks: [
        done("0001", at(6, 10)),
        done("0002", at(5, 20)),
        done("0003", at(3, 9), "0007"),
        done("0004", at(6, 10)),
        done("0005", at(6, 12), "0007"),
        done("0006", null),
        done("0008", at(4, 8)),
        done("0009", at(26 - 30, 8)),
      ],
    }),
  )[3];
  const cards = column?.cards ?? [];
  const shown = (period: Parameters<typeof doneGroups>[1]) => doneGroups(cards, period, now, "en-US").map((g) => [g.heading, g.cards.map((c) => c.key)]);

  test("puts the latest finished first, by local day; a design counts from its last Task; ties go to the newer card", () => {
    expect(shown("week")).toEqual([
      ["Today · 3", ["design:0007", "task:0004", "task:0001"]],
      ["Yesterday · 1", ["task:0002"]],
      ["October 4, 2026 · 1", ["task:0008"]],
    ]);
    const design = cards.find((c) => c.kind === "design");
    expect(design?.kind === "design" && design.tasks.map((t) => t.id)).toEqual(["0003", "0005"]);
  });

  test("the period lets through today, the last 7 or 30 local days, or all with the undated cards last", () => {
    expect(shown("today")).toEqual([["Today · 3", ["design:0007", "task:0004", "task:0001"]]]);
    expect(shown("month").map(([heading]) => heading)).toEqual(["Today · 3", "Yesterday · 1", "October 4, 2026 · 1", "September 26, 2026 · 1"]);
    expect(shown("all").at(-1)).toEqual(["No date · 1", ["task:0006"]]);
    expect(shown("all").flatMap(([, keys]) => keys)).toHaveLength(cards.length);
  });

  test("Last 7 days starts at midnight six local days ago", () => {
    const edge = buildBoard(snapshot({ tasks: [done("0001", at(30 - 30, 0)), done("0002", at(29 - 30, 23, 59))] }))[3]?.cards ?? [];
    expect(doneGroups(edge, "week", now, "en-US").map((g) => g.heading)).toEqual(["September 30, 2026 · 1"]);
  });

  test("i periodi limitati includono il primo istante ed escludono la mezzanotte successiva, anche al cambio dell'ora", () => {
    for (const date of [now, new Date(2026, 2, 29, 15), new Date(2026, 9, 25, 15)]) {
      for (const [period, days] of [["today", 1], ["week", 7], ["month", 30]] as const) {
        const from = new Date(date.getFullYear(), date.getMonth(), date.getDate() - days + 1).getTime();
        const until = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
        const edge = buildBoard(snapshot({ tasks: [
          done("start001", new Date(from).toISOString()),
          done("before01", new Date(from - 1).toISOString()),
          done("last0001", new Date(until - 1).toISOString()),
          done("nextday1", new Date(until).toISOString()),
          done("future01", new Date(until).toISOString(), "design01"),
          done("future02", new Date(until + 86_400_000).toISOString(), "design01"),
          done("nodate01", null),
        ] }))[3]?.cards ?? [];
        const groups = doneGroups(edge, period, date, "en-US");
        expect(groups.flatMap((g) => g.cards.map((c) => c.key))).toEqual(["task:last0001", "task:start001"]);
        expect(groups.reduce((count, g) => count + g.cards.length, 0)).toBe(2);
        expect(doneGroups(edge, "all", date, "en-US").flatMap((g) => g.cards.map((c) => c.key))).toEqual([
          "design:design01", "task:nextday1", "task:last0001", "task:start001", "task:before01", "task:nodate01",
        ]);
      }
    }
  });

  test("a period with no cards leaves no group and the column says so", () => {
    expect(doneGroups(cards.filter((c) => c.key === "task:0009"), "week", now)).toEqual([]);
    expect(column?.hint).toBe("Nothing done in this period");
  });
});
