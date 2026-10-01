import { expect, test } from "bun:test";
import type { FileChange } from "../src/core/diff";
import type { DriftView, ProposalView, Snapshot, TaskView } from "../src/core/snapshot";
import { approveBlocker, buildBoard, dropTarget, excerpt, formatCounts, neighbour, proposalBadges, summarizeChanges, summarizeFile } from "../extension/src/webview/board/logic";

const proposal = (over: Partial<ProposalView> = {}): ProposalView => ({
  id: "0007",
  title: "Returns",
  body: "",
  stale: [],
  unbased: [],
  errors: [],
  changes: [],
  machines: [],
  actors: [],
  ...over,
});
const drift = (over: Partial<DriftView> = {}): DriftView => ({ id: "0003", title: "Code refunds late", body: "line one\n\nline two\nline three", refs: ["order/Shipped"], proposal: null, ...over });
const task = (over: Partial<TaskView> = {}): TaskView => ({ id: "0012", title: "Refunds", body: "", column: "todo", technical: false, refs: [], drift: null, file: "tasks/0012-refunds.md", ...over });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({ system: { name: "s", description: "" }, actors: [], features: [], machines: [], diagnostics: [], proposals: [], drifts: [], tasks: [], ...over });
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

test("excerpt keeps the first non-empty lines and shortens long text", () => {
  expect(excerpt("\n  one  \n\n two\nthree")).toBe("one\ntwo");
  expect(excerpt("one\ntwo\nthree", 3)).toBe("one\ntwo\nthree");
  expect(excerpt("")).toBe("");
  const long = excerpt("x".repeat(500), 2, 50);
  expect(long.length).toBe(50);
  expect(long.endsWith("…")).toBe(true);
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

test("a Drift with an attached Proposal inherits its approval blocker", () => {
  const blocked = buildBoard(snapshot({ proposals: [proposal({ id: "0008", stale: ["x.md"] })], drifts: [drift({ proposal: "0008" })] }))[0]?.cards.at(-1);
  expect(blocked).toMatchObject({ kind: "drift", proposal: "0008" });
  expect(blocked?.kind === "drift" && blocked.acceptBlocker).toContain("Stale");
  const ok = buildBoard(snapshot({ proposals: [proposal({ id: "0008" })], drifts: [drift({ proposal: "0008" })] }))[0]?.cards.at(-1);
  expect(ok?.kind === "drift" && ok.acceptBlocker).toBeNull();
  const plain = buildBoard(snapshot({ drifts: [drift()] }))[0]?.cards[0];
  expect(plain).toMatchObject({ proposal: null, acceptBlocker: null, excerpt: "line one\nline two" });
});
