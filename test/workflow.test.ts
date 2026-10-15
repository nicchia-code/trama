import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { handOver } from "./handover";
import { approveProposal, discardProposal, editInProposal, getProposal, health, newProposal, rejectProposal, submitProposal, validateProposal } from "../src/core/proposals";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { type CardKind, syncShortNumbers } from "../src/core/short-numbers";
import { type Drift, driftOptions, driftSides, getDrift, getTask, listDrifts, listTasks, moveTask, newDrift, newTask, releaseTasks, resolveDrift, takeBackTask } from "../src/core/work";
import { coverWithTask } from "./cover";

/** The same options as FIX_OPTIONS, as the command line takes them. */
const CLI_OPTIONS = FIX_OPTIONS.flatMap((o) => ["--option", o.title, "--option-text", o.text]);

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** How a card is written in the output of a command: its short number while live, else its identity. */
const named = (kind: CardKind, id: string) => syncShortNumbers(p).name(kind, id);
const modelFile = (rel: string) => join(p.dir, "model", rel);

function editOrder(id: string, transform: (text: string) => string) {
  const file = editInProposal(p, id, "checkout/order.md");
  writeFileSync(file, transform(readFileSync(file, "utf8")));
}

describe("Proposals", () => {
  test("approving applies the new files and deletions, and records the status", () => {
    const prop = newProposal(p, "Returns");
    editOrder(prop.id, (t) => t.replace("### Shipped (final)", "### Shipped\n- `user.CANCEL` → Returned\n\n### Returned (final)"));
    const fresh = editInProposal(p, prop.id, "checkout/returns.md");
    writeFileSync(fresh, "# Returns\n\nA return.\n\n## States\n\n### Open (initial)\n");
    coverWithTask(p, prop.id, "checkout");
    handOver(p, prop.id);
    approveProposal(p, prop.id);

    expect(loadModel(p).diagnostics).toEqual([]);
    expect(loadModel(p).machines.has("returns")).toBe(true);
    expect(getProposal(p, prop.id).data.status).toBe("approved");
  });

  test("editing the same file twice keeps the original base hash and the edits", () => {
    const prop = newProposal(p, "Twice");
    const file = editInProposal(p, prop.id, "checkout/order.md");
    const before = getProposal(p, prop.id).data.base;
    appendFileSync(file, "\nextra prose\n");
    expect(editInProposal(p, prop.id, "checkout/order.md")).toBe(file);
    expect(readFileSync(file, "utf8")).toContain("extra prose");
    expect(getProposal(p, prop.id).data.base).toEqual(before);
  });

  test("a Proposal goes stale when the Model file it touched changes, and cannot be approved", () => {
    const prop = newProposal(p, "Late");
    editOrder(prop.id, (t) => t);
    expect(health(p, getProposal(p, prop.id)).stale).toEqual([]);
    appendFileSync(modelFile("checkout/order.md"), "\n");
    handOver(p, prop.id);
    expect(health(p, getProposal(p, prop.id)).stale).toEqual(["checkout/order.md"]);
    expect(() => approveProposal(p, prop.id)).toThrow(/stale/);
  });

  test("a new file goes stale when someone creates the same file in the Model first", () => {
    const prop = newProposal(p, "Collision");
    writeFileSync(editInProposal(p, prop.id, "checkout/returns.md"), "# R\n\n## States\n\n### A (initial)\n");
    writeFileSync(modelFile("checkout/returns.md"), "# Other\n\n## States\n\n### B (initial)\n");
    handOver(p, prop.id);
    expect(() => approveProposal(p, prop.id)).toThrow(/stale/);
  });

  test("an invalid result is refused and leaves the Model untouched", () => {
    const prop = newProposal(p, "Broken");
    editOrder(prop.id, (t) => t.replace("→ Paid", "→ Nowhere"));
    const before = readFileSync(modelFile("checkout/order.md"), "utf8");
    handOver(p, prop.id);
    expect(() => approveProposal(p, prop.id)).toThrow(/unknown State "Nowhere"/);
    expect(readFileSync(modelFile("checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, prop.id).data.status).toBe("open");
  });

  test("a Model file dropped into the Proposal by hand, without `proposal edit`, is refused", () => {
    const prop = newProposal(p, "Sneaky");
    mkdirSync(join(prop.dir, "model", "checkout"), { recursive: true });
    writeFileSync(join(prop.dir, "model", "checkout", "ghost.md"), "# G\n\n## States\n\n### A (initial)\n");
    handOver(p, prop.id);
    expect(() => approveProposal(p, prop.id)).toThrow(/never registered: checkout\/ghost\.md/);
    expect(existsSync(modelFile("checkout/ghost.md"))).toBe(false);
  });

  test("rejecting keeps the feedback and blocks later approval", () => {
    const prop = newProposal(p, "Nope");
    handOver(p, prop.id);
    rejectProposal(p, prop.id, "Split it up.");
    const again = getProposal(p, prop.id);
    expect(again.data.status).toBe("rejected");
    expect(again.body).toContain("## Feedback\n\nSplit it up.");
    expect(() => approveProposal(p, prop.id)).toThrow(/rejected/);
  });

  test("rejecting needs no feedback: empty, blank or missing text rejects without a Feedback section", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
    const [a, b, c] = ["A", "B", "C"].map((title) => newProposal(p, title).id) as [string, string, string];
    for (const id of [a, b, c]) handOver(p, id);
    rejectProposal(p, a, "   ");
    rejectProposal(p, b);
    expect(cli("proposal", "reject", c).out).toContain(`Rejected Proposal ${c}`);
    for (const id of [a, b, c]) {
      expect(getProposal(p, id).data.status).toBe("rejected");
      expect(getProposal(p, id).body).not.toContain("Feedback");
    }
    const d = newProposal(p, "D").id;
    handOver(p, d);
    cli("proposal", "reject", d, "--feedback", "Split it.");
    expect(getProposal(p, d).body).toContain("## Feedback\n\nSplit it.");
    expect(() => rejectProposal(p, d)).toThrow(/rejected/);
  });

  test("paths cannot escape the Model directory", () => {
    const prop = newProposal(p, "Escape");
    expect(() => editInProposal(p, prop.id, "../../../etc/passwd.md")).toThrow();
    expect(existsSync(join(dir, "etc"))).toBe(false);
  });
});

describe("Tasks and Drifts", () => {
  test("a Task needs Model references unless technical, and every reference must resolve", () => {
    expect(() => newTask(p, { title: "x", refs: [], technical: false })).toThrow(/at least one Model element/);
    expect(() => newTask(p, { title: "x", refs: ["order"], technical: true })).toThrow(/Technical/);
    expect(() => newTask(p, { title: "x", refs: ["order/Nope"], technical: false })).toThrow(/no State "Nope"/);
    const ok = newTask(p, { title: "Cancel flow", refs: ["order/Paid/user.CANCEL", "user.CANCEL"], technical: false });
    expect(getTask(p, ok.id).data.refs).toHaveLength(2);
  });

  test("a Task can come from a Proposal, which must exist; Tasks without the link still load", () => {
    expect(() => newTask(p, { title: "x", refs: ["order"], technical: false, proposal: "42" })).toThrow(/No Proposal/);
    const prop = newProposal(p, "Returns");
    const linked = newTask(p, { title: "Return flow", refs: ["order"], technical: false, proposal: prop.id });
    expect(getTask(p, linked.id).data.proposal).toBe(prop.id);
    expect(run(["--root", dir, "task", "show", linked.id], process.cwd()).out).toContain(`from Proposal ${named("proposal", prop.id)}`);

    const plain = newTask(p, { title: "Plain", refs: ["order"], technical: false });
    const text = readFileSync(plain.path, "utf8").replace(/^proposal:.*\n/m, "");
    writeFileSync(plain.path, text);
    expect(getTask(p, plain.id).data.proposal).toBeNull();
  });

  test("a Technical Task written with a Proposal belongs to its design, like the other Tasks", () => {
    const prop = newProposal(p, "Returns");
    expect(() => newTask(p, { title: "x", refs: [], technical: true, proposal: "42" })).toThrow(/No Proposal/);
    const tech = newTask(p, { title: "Upgrade", refs: [], technical: true, proposal: prop.id });
    const a = newTask(p, { title: "A", refs: ["order"], technical: false, proposal: prop.id });
    const b = newTask(p, { title: "B", refs: ["order"], technical: false, proposal: prop.id });
    expect(getTask(p, tech.id).data.proposal).toBe(prop.id);
    const board = run(["--root", dir, "board"], process.cwd()).out;
    expect(board).toContain(`Proposal ${named("proposal", prop.id)} "Returns" (0/3 done)`);
    expect(board).toContain(`  - ${named("task", tech.id)} Upgrade`);
    expect(board).toContain(`  - ${named("task", a.id)} A [todo]`);
    expect(board).toContain(`  - ${named("task", b.id)} B [todo]`);
  });

  test("the agent takes a Task by moving it to In progress; the developer cannot move it until it is released", () => {
    const task = (): string => newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const id = task();
    expect(moveTask(p, id, "doing", "developer").data.agent).toBe(false);
    moveTask(p, id, "todo", "developer");

    expect(moveTask(p, id, "doing", "agent").data).toMatchObject({ column: "doing", agent: true });
    expect(getTask(p, id).data.agent).toBe(true);
    for (const column of ["todo", "doing", "done"]) {
      expect(() => moveTask(p, id, column, "developer")).toThrow(new RegExp(`^(?!.*(button|card|Board)).*agent is working on Task ${named("task", id)}.*"trama task take-back ${named("task", id)}"`, "i"));
    }
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: true });

    expect(moveTask(p, id, "doing", "agent").data.agent).toBe(true);
    expect(moveTask(p, id, "done", "agent").data).toMatchObject({ column: "done", agent: false });
    expect(moveTask(p, id, "doing", "agent").data.agent).toBe(true);
    expect(moveTask(p, id, "todo", "agent").data).toMatchObject({ column: "todo", agent: false });
    expect(moveTask(p, id, "done", "developer").data.column).toBe("done");
  });

  test("a Task remembers when it arrived in Done, keeps it Done to Done and forgets it when it leaves", () => {
    const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    expect(getTask(p, id).data.finished).toBeNull();
    const before = Date.now();
    const first = moveTask(p, id, "done", "developer").data.finished as string;
    expect(Date.parse(first)).toBeGreaterThanOrEqual(before - 1000);
    expect(getTask(p, id).data.finished).toBe(first);
    expect(moveTask(p, id, "done", "agent").data.finished).toBe(first);

    moveTask(p, id, "doing", "agent");
    expect(getTask(p, id).data.finished).toBeNull();
    expect(readFileSync(getTask(p, id).path, "utf8")).not.toContain("finished");
    expect(moveTask(p, id, "done", "agent").data.finished).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // A Task that reached Done before the instant was kept reads as Done with no instant.
    const old = getTask(p, id);
    writeFileSync(old.path, readFileSync(old.path, "utf8").replace(/^finished:.*\n/m, ""));
    expect(getTask(p, id).data).toMatchObject({ column: "done", finished: null });
  });

  test("the agent cannot start a blocked Task, from any column; the developer and the agent's other moves are free", async () => {
    const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], origin: id, happens: "The code does it one way.", should: "The Model says another." });
    const agent = (column: string) => run(["--root", dir, "task", "move", id, column], process.cwd(), { TRAMA_AGENT: "1" });

    expect(() => moveTask(p, id, "doing", "agent")).toThrow(new RegExp(`Drift ${named("drift", drift.id)} "Refunds differ".*developer must decide`));
    expect(() => agent("doing")).toThrow(/Drift .* "Refunds differ"/);
    expect(getTask(p, id).data).toMatchObject({ column: "todo", agent: false });

    expect(moveTask(p, id, "doing", "developer").data).toMatchObject({ column: "doing", agent: false });
    expect(() => moveTask(p, id, "doing", "agent")).toThrow(/blocked/);
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    expect(moveTask(p, id, "done", "agent").data.column).toBe("done");
    expect(() => moveTask(p, id, "doing", "agent")).toThrow(new RegExp(`Drift ${named("drift", drift.id)} "Refunds differ"`));
    expect(getTask(p, id).data).toMatchObject({ column: "done", agent: false });
    expect(moveTask(p, id, "todo", "agent").data.column).toBe("todo");

    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, drift.id).data.task as string;
    expect(() => moveTask(p, id, "doing", "agent")).toThrow(new RegExp(`Task ${named("task", fix)} .*fixes the code for Drift ${named("drift", drift.id)}`));
  });

  test("fixing the code of a Drift sends its origin Task back to To do, waiting for the fix; other resolutions leave it", () => {
    const origin = (column: "doing" | "done") => {
      const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
      moveTask(p, id, column, "agent");
      return id;
    };
    const drift = (id: string | undefined) => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], origin: id, happens: "The code does it one way.", should: "The Model says another." }).id;

    const working = origin("doing");
    const fixed = resolveDrift(p, drift(working), "fix-code", [], { option: 1 });
    expect(getTask(p, working).data).toMatchObject({ column: "todo", agent: false });
    expect(() => moveTask(p, working, "doing", "agent")).toThrow(new RegExp(`Task ${named("task", fixed.data.task as string)} `));
    moveTask(p, fixed.data.task as string, "done", "developer");
    expect(moveTask(p, working, "doing", "agent").data.agent).toBe(true);

    const finished = origin("done");
    resolveDrift(p, drift(finished), "fix-code", [], { option: 1 });
    expect(getTask(p, finished).data.column).toBe("done");
    expect(() => moveTask(p, finished, "doing", "agent")).toThrow(/fixes the code for Drift/);
    expect(getTask(p, finished).data.column).toBe("done");

    const dismissedOrigin = origin("doing");
    resolveDrift(p, drift(dismissedOrigin), "dismiss");
    expect(getTask(p, dismissedOrigin).data).toMatchObject({ column: "doing", agent: true });

    const noOrigin = origin("doing");
    resolveDrift(p, drift(undefined), "fix-code", [], { option: 1 });
    expect(getTask(p, noOrigin).data).toMatchObject({ column: "doing", agent: true });
  });

  test("taking back clears the mark and keeps the Task In progress", () => {
    const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    expect(() => takeBackTask(p, id)).toThrow(/has not taken/);
    moveTask(p, id, "doing", "agent");
    const cli = (env: Record<string, string>) => run(["--root", dir, "task", "take-back", id], process.cwd(), env);

    cli({ TRAMA_AGENT: "1" });
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    moveTask(p, id, "doing", "agent");
    cli({ CURSOR_AGENT: "1" });
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    moveTask(p, id, "doing", "agent");
    cli({});

    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    expect(moveTask(p, id, "done", "developer").data.column).toBe("done");
  });

  test("unrecognized task origins are ownerless and legacy editor holders are released by either chat", () => {
    const cliTake = (id: string) => run(["--root", dir, "task", "move", id, "doing"], process.cwd(), { TRAMA_AGENT: "1" });
    const editorEnd = newTask(p, { title: "Editor origin", refs: ["order"], technical: false }).id;
    const cursorEnd = newTask(p, { title: "Cursor origin", refs: ["order"], technical: false }).id;
    cliTake(editorEnd);
    cliTake(cursorEnd);
    expect([editorEnd, cursorEnd].map((id) => getTask(p, id).data.holder)).toEqual([null, null]);
    expect(releaseTasks(p, { chat: "editor" }).map((task) => task.id)).toEqual([editorEnd, cursorEnd]);

    const cursorRelease = newTask(p, { title: "Cursor release", refs: ["order"], technical: false }).id;
    cliTake(cursorRelease);
    expect(releaseTasks(p, { chat: "cursor" }).map((task) => task.id)).toEqual([cursorRelease]);

    const legacy = newTask(p, { title: "Legacy editor holder", refs: ["order"], technical: false }).id;
    moveTask(p, legacy, "doing", "agent", { chat: "cursor" });
    const task = getTask(p, legacy);
    const content = readFileSync(task.path, "utf8");
    const legacyContent = content.replace(/^agent: cursor$/m, "agent: editor");
    expect(legacyContent).not.toBe(content);
    writeFileSync(task.path, legacyContent);
    expect(getTask(p, legacy).data.holder).toBeNull();
    expect(releaseTasks(p, { chat: "cursor" }).map((task) => task.id)).toEqual([legacy]);
  });

  test("releasing sends back to To do the Tasks taken by the origin that ended, and those taken with no holder kept", () => {
    const [a, b, c, d, e] = [1, 2, 3, 4, 5].map(() => newTask(p, { title: "T", refs: ["order"], technical: false }).id) as [string, string, string, string, string];
    moveTask(p, a, "doing", "agent");
    moveTask(p, b, "doing", "developer");
    moveTask(p, d, "doing", "agent", { terminal: "aaa111" });
    moveTask(p, d, "doing", "agent", { terminal: "bbb222" }); // taken again: the holder stays
    moveTask(p, e, "doing", "agent", { chat: "cursor" });
    expect(releaseTasks(p, { terminal: "bbb222" }).map((t) => t.id)).toEqual([a]);
    expect([a, b, c, d, e].map((id) => getTask(p, id).data)).toMatchObject([
      { column: "todo", agent: false },
      { column: "doing", agent: false },
      { column: "todo", agent: false },
      { column: "doing", agent: true, holder: "aaa111" },
      { column: "doing", agent: true, holder: "cursor" },
    ]);
    expect(releaseTasks(p, { chat: "cursor" }).map((t) => t.id)).toEqual([e]);
    expect(releaseTasks(p, { terminal: "aaa111" }).map((t) => t.id)).toEqual([d]);
    expect(readFileSync(getTask(p, d).path, "utf8")).toContain("agent: false");
    expect(moveTask(p, a, "done", "developer").data.column).toBe("done");
    expect(releaseTasks(p, {})).toEqual([]);
  });

  test("a taken Task is marked (agent working) in the board, the task list and task show", async () => {
    const prop = newProposal(p, "Returns");
    const mk = (title: string, proposal?: string) => newTask(p, { title, refs: ["order"], technical: false, proposal }).id;
    const [taken, free, a, b] = [mk("Taken"), mk("Free"), mk("In design", prop.id), mk("Other in design", prop.id)] as [string, string, string, string];
    for (const id of [taken, a]) moveTask(p, id, "doing", "agent");
    moveTask(p, free, "doing", "developer");
    moveTask(p, b, "doing", "developer");
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {}).out;

    const board = cli("board");
    expect(board).toContain(`- ${named("task", taken)} Taken (agent working)\n`);
    expect(board).toContain(`  - ${named("task", a)} In design (agent working) [doing]`);
    expect(board).toContain(`- ${named("task", free)} Free\n`);
    expect(board).not.toContain(`${named("task", b)} Other in design (agent working)`);
    expect(cli("task", "list")).toContain(`- ${named("task", taken)} Taken (agent working)`);
    expect(cli("task", "list")).not.toContain(`${named("task", free)} Free (agent working)`);
    expect(cli("task", "show", taken)).toContain("(agent working)");
    expect(cli("task", "show", free)).not.toContain("(agent working)");
    expect(JSON.parse(run(["--root", dir, "--json", "task", "list"], process.cwd(), {}).out).tasks.find((t: { id: string }) => t.id === taken).agent).toBe(true);
  });

  test("a blocked Task is marked in the board, the task list and task show, with every blocker; Drift views list no Tasks", async () => {
    const blockedTask = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const waiting = newTask(p, { title: "Waiting flow", refs: ["cart"], technical: false }).id;
    const free = newTask(p, { title: "Free flow", refs: ["payment"], technical: false }).id;
    const d1 = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    const d2 = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Cancel differs", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another." });
    const d3 = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Waiting origin", refs: ["cart"], origin: waiting, happens: "The code does it one way.", should: "The Model says another." });
    resolveDrift(p, d3.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, d3.id).data.task as string;
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});

    const marks = ` (blocked by Drift ${named("drift", d1.id)}) (blocked by Drift ${named("drift", d2.id)})`;
    expect(cli("board").out).toContain(`- ${named("task", blockedTask)} Return flow${marks}\n`);
    expect(cli("board").out).toContain(`- ${named("task", waiting)} Waiting flow (waiting for Task ${named("task", fix)})\n`);
    expect(cli("board").out).toContain(`- ${named("task", free)} Free flow\n`);
    expect(cli("task", "list").out).toContain(`- ${named("task", blockedTask)} Return flow${marks}`);
    const shown = cli("task", "show", blockedTask).out;
    expect(shown).toContain(`${marks}\nBlocked by Drift ${named("drift", d1.id)}: Refunds differ\nBlocked by Drift ${named("drift", d2.id)}: Cancel differs`);
    expect(cli("task", "show", waiting).out).toContain(`Waiting for Task ${named("task", fix)}: Fix code to match the Model: Waiting origin`);
    expect(cli("task", "show", free).out).not.toContain("locked");
    const json = JSON.parse(cli("--json", "task", "list").out).tasks.find((t: { id: string }) => t.id === blockedTask);
    expect(json.blockedBy.map((b: { drift: string }) => b.drift)).toEqual([d1.id, d2.id]);

    moveTask(p, blockedTask, "done", "developer");
    expect(cli("task", "list").out).not.toContain(`${named("task", blockedTask)} Return flow (blocked`);
    const driftView = cli("drift", "show", d1.id).out;
    expect(driftView).not.toContain(blockedTask);
    expect(driftView).not.toContain("locked");
  });

  test("task next names the oldest runnable Task, recomputed each time, within a design when asked, and moves nothing", () => {
    const prop = newProposal(p, "Design");
    const blockedFirst = newTask(p, { title: "Return flow", refs: ["order"], technical: false, proposal: prop.id }).id;
    const outside = newTask(p, { title: "Outside flow", refs: ["payment"], technical: false }).id;
    const inDesign = newTask(p, { title: "Cart flow", refs: ["cart"], technical: false, proposal: prop.id }).id;
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], origin: blockedFirst, happens: "The code does it one way.", should: "The Model says another." });
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});

    expect(cli("task", "next").out).toBe(`Next Task: ${named("task", outside)} Outside flow`);
    expect(cli("task", "next", "--proposal", prop.id).out).toBe(`Next Task in Proposal ${named("proposal", prop.id)}: ${named("task", inDesign)} Cart flow`);
    expect(JSON.parse(cli("--json", "task", "next").out).next).toEqual({ id: outside, number: named("task", outside), title: "Outside flow" });
    expect(listTasks(p).every((t) => t.data.column === "todo" && !t.data.agent)).toBe(true);
    expect(() => cli("task", "next", "--proposal", "9999")).toThrow(/No Proposal/);

    moveTask(p, outside, "done", "developer");
    moveTask(p, inDesign, "done", "developer");
    const none = cli("task", "next", "--proposal", prop.id);
    expect(none.exit).toBe(0);
    expect(none.out.split("\n")[0]).toBe(`No Task is runnable in Proposal ${named("proposal", prop.id)}.`);
    expect(none.out).toContain(`- ${named("task", blockedFirst)} Return flow (Proposal ${named("proposal", prop.id)}) (blocked by Drift ${named("drift", drift.id)})`);
    expect(none.out).not.toContain("Outside flow");

    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, drift.id).data.task as string;
    expect(getTask(p, fix).data.proposal).toBe(prop.id);
    expect(cli("task", "next").out).toBe(`Next Task: ${named("task", fix)} ${getTask(p, fix).title}`);
    expect(cli("task", "next", "--proposal", prop.id).out).toBe(`Next Task in Proposal ${named("proposal", prop.id)}: ${named("task", fix)} ${getTask(p, fix).title}`);
    moveTask(p, fix, "done", "developer");
    expect(cli("task", "next", "--proposal", prop.id).out).toBe(`Next Task in Proposal ${named("proposal", prop.id)}: ${named("task", blockedFirst)} Return flow`);
  });

  test("task next --batch groups up to --max runnable Tasks that concern different things, starting with the next one", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
    const add = (title: string, refs: string[], proposal?: string) => newTask(p, { title, refs, technical: false, ...(proposal ? { proposal } : {}) }).id;
    const prop = newProposal(p, "Design");
    const blocked = add("Blocked", ["warehouse.PACKAGE_READY"]);
    const paid = add("Paid", ["order/Paid"], prop.id);
    const order = add("Whole order", ["order"], prop.id);
    const payment = add("Payment", ["payment"], prop.id);
    const cart = add("Cart", ["cart/Empty"]);
    const draft = add("Draft", ["order/Draft", "requirements/ui#General"]);
    const fifth = add("Fifth", ["user.CANCEL"]);
    const sixth = add("Sixth", ["stripe"]);
    newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Stop", refs: ["warehouse.PACKAGE_READY"], origin: blocked, happens: "One way.", should: "Another." });

    // `order` contains `order/Paid`, so it waits for a later group; `order/Draft` is a sibling of `order/Paid` and joins.
    const group = [paid, payment, cart, draft, fifth, sixth];
    expect(cli("task", "next", "--batch").out).toBe(group.map((id) => `${named("task", id)} ${getTask(p, id).title}`).join("\n"));
    expect(JSON.parse(cli("--json", "task", "next", "--batch").out).batch.map((t: { id: string; number: string }) => [t.id, t.number])).toEqual(group.map((id) => [id, named("task", id)]));
    expect(cli("task", "next", "--batch", "--max", "2").out).toBe(group.slice(0, 2).map((id) => `${named("task", id)} ${getTask(p, id).title}`).join("\n"));
    expect(cli("task", "next", "--batch", "--max", "7").out).toBe(group.map((id) => `${named("task", id)} ${getTask(p, id).title}`).join("\n"));
    expect(cli("task", "next", "--batch", "--proposal", prop.id).out).toBe(`${named("task", paid)} Paid\n${named("task", payment)} Payment`);
    expect(() => cli("task", "next", "--batch", "--max", "0")).toThrow(/--max must be a positive integer/);
    expect(() => cli("task", "next", "--batch", "--max", "2.5")).toThrow(/--max must be a positive integer/);
    expect(() => cli("task", "next", "--batch", "--max", "abc")).toThrow(/--max must be a positive integer/);
    expect(listTasks(p).every((t) => t.data.column === "todo" && !t.data.agent)).toBe(true);


    for (const id of [paid, order, payment]) moveTask(p, id, "done", "developer");
    expect(cli("task", "next", "--batch", "--proposal", prop.id).out).toBe(cli("task", "next", "--proposal", prop.id).out);
  });
  test("task next filters, de-duplicates and validates identities while preserving proposal and blocker scope", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
    const prop = newProposal(p, "Filtered");
    const first = newTask(p, { title: "First", refs: ["order"], technical: false, proposal: prop.id }).id;
    const blocked = newTask(p, { title: "Blocked", refs: ["payment"], technical: false, proposal: prop.id }).id;
    const outside = newTask(p, { title: "Outside", refs: ["cart"], technical: false }).id;
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Block", refs: ["payment"], origin: blocked, happens: "A.", should: "B." });

    expect(cli("task", "next", "--task", first, "--task", first, "--batch").out).toBe(`${named("task", first)} First`);
    expect(cli("task", "next", "--task", first, "--task", outside, "--proposal", prop.id).out).toBe(`Next Task in Proposal ${named("proposal", prop.id)}: ${named("task", first)} First`);
    expect(cli("task", "next", "--task", blocked, "--batch").out).toContain(`(blocked by Drift ${named("drift", drift.id)})`);
    expect(() => cli("task", "next", "--task", "not-a-task")).toThrow(/No Task with ID/);
    expect(listTasks(p).every((t) => t.data.column === "todo" && !t.data.agent)).toBe(true);
  });

  test("the command line takes the Task only inside the terminal Trama started or Cursor's chat", async () => {
    const run2 = (env: Record<string, string>, ...args: string[]) => run(["--root", dir, "task", "move", ...args], process.cwd(), env);
    const [a, b, c] = [1, 2, 3].map(() => newTask(p, { title: "T", refs: ["order"], technical: false }).id) as [string, string, string];

    run2({}, a, "doing");
    expect(getTask(p, a).data.agent).toBe(false);

    run2({ TRAMA_AGENT: "1" }, b, "doing");
    expect(getTask(p, b).data.agent).toBe(true);
    expect(() => run2({}, b, "done")).toThrow(/agent is working on Task/);
    run2({ TRAMA_AGENT: "1" }, b, "done");
    expect(getTask(p, b).data).toMatchObject({ column: "done", agent: false });

    run2({ TRAMA_AGENT: "1" }, c, "doing");
    expect(getTask(p, c).data.agent).toBe(true);

    run2({ CURSOR_AGENT: "0" }, a, "todo");
    run2({ CURSOR_AGENT: "1" }, a, "doing");
    expect(getTask(p, a).data.agent).toBe(true);
    expect(() => run2({}, a, "done")).toThrow(/agent is working on Task/);
  });

  test("the textual board shows a design once with its Tasks, while task list stays flat", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});
    const prop = newProposal(p, "Returns");
    const mk = (title: string, proposal?: string) => newTask(p, { title, refs: ["order"], technical: false, proposal }).id;
    const [a, b, c] = [mk("Return request", prop.id), mk("Refund on return", prop.id), mk("Return label", prop.id)];
    mk("Alone");
    const single = newProposal(p, "Lonely");
    mk("Only one", single.id);
    cli("task", "move", a as string, "done");
    cli("task", "move", b as string, "doing");

    const board = cli("board").out;
    expect(board).toContain(`## In progress\n- Proposal ${named("proposal", prop.id)} "Returns" (1/3 done)\n  - ${named("task", a as string)} Return request [done]\n  - ${named("task", b as string)} Refund on return [doing]\n  - ${named("task", c as string)} Return label [todo]`);
    expect(board.match(new RegExp(`Proposal ${named("proposal", prop.id)} "Returns"`, "g"))).toHaveLength(1);
    expect(board).toMatch(/## To do\n- T\d+ Alone\n- T\d+ Only one\n/);

    const list = cli("task", "list", "--column", "todo").out;
    expect(list).toContain(`- ${named("task", c as string)} Return label (Proposal ${named("proposal", prop.id)})`);
    expect(list).not.toContain("Refund on return");
    const json = JSON.parse(cli("--json", "board").out) as { doing: { kind: string; total?: number }[] };
    expect(json.doing[0]).toMatchObject({ kind: "design", total: 3 });
  });

  test("resolving a Drift with fix-code creates a linked Task with the same references", () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Seen in refund.ts", should: "The Model says another." });
    const resolved = resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const task = getTask(p, resolved.data.task as string);
    expect(task.data).toMatchObject({ column: "todo", refs: ["order/Shipped"], drift: drift.id, technical: false });
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "resolved", resolution: "fix-code" });
    expect(() => resolveDrift(p, drift.id, "dismiss")).toThrow(/already resolved/);
  });

  test("fixing the code of a Drift with options needs one of them; the Task carries it with the note, and the Drift keeps both", () => {
    const make = (where = "`src/refund.ts`") => newDrift(p, { options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Refunds after pickup.", should: "No refund after pickup.", where });
    const drift = make("`src/refund.ts`");
    for (const choice of [{}, { note: "Mind it." }, { option: 0 }, { option: 3 }, { option: 1.5 }, { option: Number.NaN }])
      expect(() => resolveDrift(p, drift.id, "fix-code", [], choice)).toThrow(/An option must be chosen/);
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "open", resolution: null, task: null, option: null, note: null });
    expect(listTasks(p)).toHaveLength(0);

    const resolved = resolveDrift(p, drift.id, "fix-code", [], { option: 2, note: "  Keep the audit log.  " });
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "resolved", resolution: "fix-code", option: 2, note: "Keep the audit log." });
    expect(getTask(p, resolved.data.task as string).body).toBe(
      "# Fix code to match the Model: Refund too late\n\n## What happens\n\nRefunds after pickup.\n\n## What should happen\n\nNo refund after pickup.\n\n## Chosen option\n\n**Remove the code**\n\nDrop the behaviour altogether.\n\n## Note\n\nKeep the audit log.\n\n## Where in the code\n\n`src/refund.ts`\n",
    );

    const plain = resolveDrift(p, make().id, "fix-code", [], { option: 1 });
    expect(getTask(p, plain.data.task as string).body).not.toContain("## Note");
    expect(getTask(p, plain.data.task as string).body).toContain("## Chosen option\n\n**Change the code**\n\nMake the code do what the Model says.");
  });

  test("a Drift without options is fixed without choosing, with or without a note; keeping what happens takes neither option nor note", () => {
    const bare = (title: string) => {
      const d = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], happens: "Code does it.", should: "Model says so." });
      writeFileSync(d.path, readFileSync(d.path, "utf8").replace(/\n## Fix options[\s\S]*/, "\n"));
      return d;
    };
    const old = bare("Old");
    expect(() => resolveDrift(p, old.id, "fix-code", [], { option: 1 })).toThrow(/no fix options/);
    const fixed = resolveDrift(p, old.id, "fix-code", [], { note: "Careful." });
    expect(getDrift(p, old.id).data).toMatchObject({ option: null, note: "Careful." });
    expect(getTask(p, fixed.data.task as string).body).toBe("# Fix code to match the Model: Old\n\n## What happens\n\nCode does it.\n\n## What should happen\n\nModel says so.\n\n## Note\n\nCareful.\n");
    const plainDrift = bare("Plain");
    expect(getDrift(p, plainDrift.id).data.note).toBeNull();
    resolveDrift(p, plainDrift.id, "fix-code");
    expect(getDrift(p, plainDrift.id).data).toMatchObject({ resolution: "fix-code", option: null, note: null });

    const prop = newProposal(p, "Model forgot this");
    editOrder(prop.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    const withProposal = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost", refs: ["order"], proposal: prop.id, happens: "Code does it.", should: "Model says so." });
    handOver(p, prop.id);
    const plain = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "Code does it.", should: "Model says so." });
    for (const choice of [{ option: 1 }, { note: "Why." }, { note: "" }]) {
      expect(() => resolveDrift(p, withProposal.id, "accept-proposal", [], choice)).toThrow(/only goes with fixing the code/);
      expect(() => resolveDrift(p, plain.id, "dismiss", [], choice)).toThrow(/only goes with fixing the code/);
    }
    expect(getProposal(p, prop.id).data.status).toBe("open");
    expect(getDrift(p, plain.id).data.status).toBe("open");
    expect(resolveDrift(p, plain.id, "dismiss").data.resolution).toBe("dismissed");
  });

  test("fixing the code sets aside the attached Proposal: open is rejected with feedback, Draft discarded, a refused fix changes nothing", () => {
    const make = (title: string, submit: boolean) => {
      const prop = newProposal(p, title);
      editOrder(prop.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
      const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], proposal: prop.id, happens: "Code does it.", should: "Model says so." });
      if (submit) handOver(p, prop.id);
      return { prop, drift };
    };
    const open = make("Open one", true);
    expect(() => resolveDrift(p, open.drift.id, "fix-code")).toThrow(/An option must be chosen/);
    expect(getProposal(p, open.prop.id).data.status).toBe("open");
    const out = run(["--root", dir, "drift", "resolve", open.drift.id, "--fix-code", "--option", "1"], process.cwd(), {}).out;
    expect(out).toContain(`attached Proposal ${named("proposal", open.prop.id)} rejected`);
    expect(getProposal(p, open.prop.id).data.status).toBe("rejected");
    expect(getProposal(p, open.prop.id).body).toContain(`Drift ${open.drift.id} resolved by fixing the code`);

    const draft = make("Draft one", false);
    expect(run(["--root", dir, "drift", "resolve", draft.drift.id, "--fix-code", "--option", "1"], process.cwd(), {}).out).toContain("discarded");
    expect(getProposal(p, draft.prop.id).data.status).toBe("discarded");
    expect(getProposal(p, draft.prop.id).body).not.toContain("## Feedback");
  });

  test("drift resolve --fix-code takes --option and --note on the command line; the other resolutions refuse them", () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Refunds after pickup.", should: "No refund after pickup." });
    const resolve = (...args: string[]) => run(["--root", dir, "drift", "resolve", drift.id, ...args], process.cwd(), {});
    expect(() => resolve("--fix-code")).toThrow(/An option must be chosen/);
    expect(() => resolve("--fix-code", "--option", "two")).toThrow(/An option must be chosen/);
    expect(() => resolve("--fix-code", "--option", "9")).toThrow(/An option must be chosen/);
    expect(() => resolve("--dismiss", "--option", "1")).toThrow(/only goes with fixing the code/);
    expect(() => resolve("--dismiss", "--note", "Why")).toThrow(/only goes with fixing the code/);
    expect(getDrift(p, drift.id).data.status).toBe("open");
    resolve("--fix-code", "--option", "2", "--note", "Keep the log");
    expect(getDrift(p, drift.id).data).toMatchObject({ resolution: "fix-code", option: 2, note: "Keep the log" });
  });

  test("accepting the attached Proposal approves it", () => {
    const prop = newProposal(p, "Model forgot this");
    editOrder(prop.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: prop.id, happens: "The code does it one way.", should: "The Model says another." });
    handOver(p, prop.id);
    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, prop.id).data.status).toBe("approved");
    expect(loadModel(p).machines.get("order")?.states.some((s) => s.name === "Lost")).toBe(true);
  });

  test("accepting without an attached Proposal fails and leaves the Drift open", () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/no attached Proposal/);
    expect(getDrift(p, drift.id).data.status).toBe("open");
  });

  test("a Drift remembers the Task it was filed from, which must exist; Drifts without one still load", async () => {
    const task = newTask(p, { title: "Cancel flow", refs: ["order"], technical: false });
    expect(() => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "x", refs: ["order"], origin: "42", happens: "The code does it one way.", should: "The Model says another." })).toThrow(/No Task/);
    const viaCore = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Core", refs: ["order"], origin: task.id, happens: "The code does it one way.", should: "The Model says another." });

    const viaCli = run(["--root", dir, "drift", "new", "Cli", "--where", "src/refund.ts", "--ref", "order", "--task", task.id, "--happens", "Code does it.", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd());
    const cliId = /Created Drift (D\d+)/.exec(viaCli.out)?.[1] ?? "";
    expect(getDrift(p, cliId, true).data.origin).toBe(task.id);
    expect(getDrift(p, viaCore.id).data.origin).toBe(task.id);
    expect(() => run(["--root", dir, "drift", "new", "Missing", "--where", "src/refund.ts", "--ref", "order", "--task", "42", "--happens", "Code does it.", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd())).toThrow(/No Task/);

    const scanned = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "From a scan", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(getDrift(p, scanned.id).data.origin).toBeNull();
    writeFileSync(scanned.path, readFileSync(scanned.path, "utf8").replace(/^origin:.*\n/m, ""));
    expect(getDrift(p, scanned.id).data.origin).toBeNull();
  });
  test("records, lists, and shows critical Drifts explicitly", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd());
    const critical = cli("--json", "drift", "new", "Urgent", "--where", "src/refund.ts", "--ref", "order", "--happens", "Code differs.", "--should", "Model says so.", "--critical", ...CLI_OPTIONS);
    const criticalId = JSON.parse(critical.out).id as string;
    expect(getDrift(p, criticalId).data.critical).toBe(true);
    expect(readFileSync(getDrift(p, criticalId).path, "utf8")).toContain("critical: true");
    const ordinary = cli("--json", "drift", "new", "Ordinary", "--where", "src/refund.ts", "--ref", "order", "--happens", "Code differs.", "--should", "Model says so.", ...CLI_OPTIONS);
    const ordinaryId = JSON.parse(ordinary.out).id as string;
    expect(readFileSync(getDrift(p, ordinaryId).path, "utf8")).toContain("critical: false");
    expect(cli("--json", "drift", "show", criticalId).out).toContain('"critical": true');
    expect(cli("drift", "show", criticalId).out).toContain("CRITICAL: urgent developer decision");
    expect(cli("drift", "show", ordinaryId).out).not.toContain("CRITICAL");
    expect(cli("drift", "list").out).toContain("CRITICAL: urgent developer decision");
    expect(cli("board").out).toContain("CRITICAL: urgent developer decision");
  });

  test("a Drift may say where in the code it was seen: kept as a third section, carried by the fix Task, shown by drift show", async () => {
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Where", refs: ["order"], happens: "Refunds after pickup.", should: "No refund after pickup.", where: "  `src/refund.ts`, the refund step\n\n## Not a section\n" });
    expect(driftSides(getDrift(p, drift.id))).toEqual({ happens: "Refunds after pickup.", should: "No refund after pickup.", where: "`src/refund.ts`, the refund step\n\n## Not a section" });

    const shown = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(shown).toMatch(/## What should happen[\s\S]*## Where in the code\n\n`src\/refund.ts`/);
    expect(shown.indexOf("## Where in the code")).toBeLessThan(shown.indexOf("Status:"));

    const fixed = resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    expect(getTask(p, fixed.data.task as string).body).toContain("## Where in the code\n\n`src/refund.ts`, the refund step");

    expect(() => newDrift(p, { options: FIX_OPTIONS, title: "x", refs: ["order"], happens: "Code does it.", should: "Model says so.", where: "  " })).toThrow(/Where in the code/);
    expect(() => run(["--root", dir, "drift", "new", "x", "--ref", "order", "--happens", "a", "--should", "b", "--where", "", ...CLI_OPTIONS], process.cwd())).toThrow(/Where in the code/);
    run(["--root", dir, "drift", "new", "Where", "--ref", "order", "--happens", "Code does it.", "--should", "Model says so.", "--where", "src/x.ts", ...CLI_OPTIONS], process.cwd());
    expect(driftSides(listDrifts(p).at(-1) as never)?.where).toBe("src/x.ts");
  });

  test("a Drift needs both sides, stores them as two sections and cannot be filed without one", async () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Two sides", refs: ["order"], happens: " Refunds after pickup. ", should: "No refund after pickup." });
    expect(drift.body).toBe(
      "# Two sides\n\n## What happens\n\nRefunds after pickup.\n\n## What should happen\n\nNo refund after pickup.\n\n## Fix options\n\n### Change the code\n\nMake the code do what the Model says.\n\n### Remove the code\n\nDrop the behaviour altogether.\n\n## Where in the code\n\nsrc/refund.ts\n",
    );
    expect(driftSides(getDrift(p, drift.id))).toEqual({ happens: "Refunds after pickup.", should: "No refund after pickup.", where: "src/refund.ts" });

    expect(() => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "x", refs: ["order"], happens: "  ", should: "Model says so." })).toThrow(/"What happens"/);
    expect(() => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "x", refs: ["order"], happens: "Code does it.", should: "" })).toThrow(/"What should happen"/);
    expect(() => run(["--root", dir, "drift", "new", "x", "--where", "src/refund.ts", "--ref", "order", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd())).toThrow(/"What happens"/);
    expect(listDrifts(p)).toHaveLength(1);

    writeFileSync(drift.path, "---\nstatus: resolved\nrefs: [order]\n---\n# Old\n\nFree text.\n");
    expect(driftSides(getDrift(p, drift.id))).toBeNull();
  });

  test("a new Drift needs two to five distinct fix options, each with title and text, in the order given, from core and command line", async () => {
    const file = (options: { title: string; text: string }[]) => newDrift(p, { where: "src/refund.ts", title: "x", refs: ["order"], happens: "Code does it.", should: "Model says so.", options });
    const five = ["A", "B", "C", "D", "E"].map((t) => ({ title: t, text: `Way ${t}.` }));
    const kept = file(five);
    expect(driftOptions(kept)).toEqual(five);
    expect(driftOptions(kept).map((o) => o.title)).toEqual(["A", "B", "C", "D", "E"]);
    expect(driftSides(kept)).toMatchObject({ should: "Model says so.", where: "src/refund.ts" });

    expect(() => file(FIX_OPTIONS.slice(0, 1))).toThrow(/from 2 to 5 fix options.*found 1/);
    expect(() => file([...five, { title: "F", text: "Way F." }])).toThrow(/from 2 to 5 fix options.*found 6/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "", text: "Way B." }])).toThrow(/Fix option 2 needs its title/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "B", text: " " }])).toThrow(/Fix option 2 \("B"\) needs its text/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: " A ", text: "Way B." }])).toThrow(/Two fix options are titled "A"/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "B", text: "Way B.\n### C\nWay C." }])).toThrow(/cannot contain headings/);
    expect(listDrifts(p)).toHaveLength(1);

    const args = ["--root", dir, "drift", "new", "Cli", "--where", "src/refund.ts", "--ref", "order", "--happens", "Code does it.", "--should", "Model says so."];
    expect(() => run([...args, "--option", "A", "--option-text", "Way A."], process.cwd())).toThrow(/from 2 to 5 fix options.*found 1/);
    expect(() => run([...args, "--option", "A", "--option-text", "Way A.", "--option", "B"], process.cwd())).toThrow(/Fix option 2 \("B"\) needs its text/);
    expect(() => run([...args, "--option", "A", "--option-text", "Way A.", "--option-text", "Way B."], process.cwd())).toThrow(/Fix option 2 needs its title/);
    const created = /Created Drift (D\d+)/.exec(run([...args, ...CLI_OPTIONS], process.cwd()).out)?.[1] ?? "";
    expect(driftOptions(getDrift(p, created, true))).toEqual(FIX_OPTIONS);

    const three = run([...args, ...five.slice(0, 3).flatMap((o) => ["--option", o.title, "--option-text", o.text])], process.cwd()).out;
    expect(driftOptions(getDrift(p, /Created Drift (D\d+)/.exec(three)?.[1] ?? "", true))).toEqual(five.slice(0, 3));
  });

  test("drift show lists the two sides as two blocks, says why an attached Proposal cannot be approved, and shows an old Drift as one block", async () => {
    const draft = newProposal(p, "Lost orders");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: draft.id, happens: "worker/lost.ts writes it off.", should: "Nothing writes it off." });
    const shown = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(shown).toContain("## What happens\n\nworker/lost.ts writes it off.\n\n## What should happen\n\nNothing writes it off.");
    expect(shown).toContain(`Attached Proposal: ${named("proposal", draft.id)} (draft)\nCannot be approved: Proposal ${named("proposal", draft.id)} is still being written.`);
    expect(shown).not.toContain("Description");
    const json = JSON.parse(run(["--root", dir, "--json", "drift", "show", drift.id], process.cwd()).out);
    expect(json).toMatchObject({ happens: "worker/lost.ts writes it off.", should: "Nothing writes it off.", proposalBlock: { kind: "draft" } });

    writeFileSync(drift.path, "---\nstatus: resolved\nrefs: [order]\nproposal: null\n---\n# Old\n\nFree text.\n");
    const old = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(old).toContain("## Description\n\nFree text.");
    expect(old).not.toContain("What happens");
  });

  test("drift show says which resolution Proposal holds an open Drift, and which one resolved a closed Drift", async () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], happens: "It writes off.", should: "It does not." });
    const res = newProposal(p, "Resolve lost", "", { kind: "resolution" });
    const file = join(res.dir, "proposal.md");
    writeFileSync(file, readFileSync(file, "utf8").replace(/^drifts:.*$/m, `drifts:\n  - drift: ${drift.id}\n    decision: dismissed`));
    const show = () => run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(show()).toContain(`In resolution Proposal ${named("proposal", res.id)} Resolve lost`);
    expect(JSON.parse(run(["--root", dir, "--json", "drift", "show", drift.id], process.cwd()).out).inResolutionProposal).toMatchObject({ id: res.id, title: "Resolve lost" });

    writeFileSync(drift.path, readFileSync(drift.path, "utf8").replace("status: open", `status: resolved\nresolvedBy: ${res.id}`));
    expect(show()).not.toContain("In resolution Proposal");
    expect(show()).toContain(`Resolved by Proposal ${named("proposal", res.id)}`);
    expect(JSON.parse(run(["--root", dir, "--json", "drift", "show", drift.id], process.cwd()).out).resolvedBy).toBe(res.id);
  });

  test("proposal show lists the Drifts a resolution resolves with their decisions; list and board mark it; other Proposals are unchanged", () => {
    const [a, b, c] = ["A", "B", "C"].map((title) => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], happens: "It does.", should: "It does not." })) as [Drift, Drift, Drift];
    const res = newProposal(p, "Resolve all", "", { kind: "resolution" });
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const decide = (d: Drift, ...rest: string[]) => out("proposal", "resolve-drift", res.id, d.id, ...rest);
    decide(a, "--decision", "fix-code", "--option", "2", "--note", "keep log");
    decide(b, "--decision", "proposal");
    decide(c, "--decision", "fix-code", "--option", "1", "--note", "stale note");
    resolveDrift(p, c.id, "dismiss");
    const show = out("proposal", "show", res.id);
    expect(show).toContain(`Resolves Drifts\n- ${named("drift", a.id)} A: Code fixed with option Remove the code · keep log\n- ${named("drift", b.id)} B: Model updated to match the code\n- ${named("drift", c.id)} C: (already resolved)`);
    const json = JSON.parse(out("--json", "proposal", "show", res.id));
    expect(json).toMatchObject({ kind: "resolution", drifts: [{ drift: a.id }, { drift: b.id }, { drift: c.id }] });
    expect(json.resolvesDrifts[2]).toMatchObject({ drift: c.id, decision: "(already resolved)" });
    expect(json.resolvesDrifts[2].note).toBeUndefined();
    expect(show).not.toContain("stale note");
    expect(out("proposal", "list")).toContain("(resolves 3 Drifts)");
    expect(out("board")).toContain("(resolves 3 Drifts)");
    // A Draft resolution hides nothing: its Drifts stay cards of their own.
    expect(out("board")).toContain(`- Drift ${named("drift", a.id)}: A`);
    const [x, y] = ["X", "Y"].map((title) => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title, refs: ["order"], happens: "It does.", should: "It does not." })) as [Drift, Drift];
    const live = newProposal(p, "Resolve live", "", { kind: "resolution" });
    out("proposal", "resolve-drift", live.id, x.id, "--decision", "fix-code", "--option", "2", "--note", "keep log");
    out("proposal", "resolve-drift", live.id, y.id, "--decision", "proposal");
    submitProposal(p, live.id);
    const open = out("board");
    expect(open).toContain(`- Proposal ${named("proposal", live.id)}: Resolve live (resolves 2 Drifts)\n  - Drift ${named("drift", x.id)}: X · Code fixed with option Remove the code\n  - Drift ${named("drift", y.id)}: Y · Model updated to match the code\n`);
    expect(open).not.toMatch(new RegExp(`^- Drift ${named("drift", x.id)}`, "m"));
    expect(open).not.toMatch(new RegExp(`^- Drift ${named("drift", y.id)}`, "m"));
    expect(JSON.parse(out("--json", "board")).toDecide.drifts.map((d: { id: string }) => d.id)).not.toContain(x.id);
    const plain = newProposal(p, "Plain");
    expect(out("proposal", "show", plain.id)).not.toContain("Resolves Drifts");
    expect(out("proposal", "list")).not.toMatch(/Plain.*resolves/);
  });
  test("a Proposal attached to a Drift that an open resolution lists stays under that Drift's line on the board", () => {
    const attached = newProposal(p, "Repair log");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Log gap", refs: ["order"], proposal: attached.id, happens: "It logs nothing.", should: "It logs each refund." });
    const res = newProposal(p, "Resolve log", "", { kind: "resolution" });
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    out("proposal", "resolve-drift", res.id, drift.id, "--decision", "proposal");
    submitProposal(p, res.id);
    const board = out("board");
    expect(board).toContain(`- Proposal ${named("proposal", res.id)}: Resolve log (resolves 1 Drift)\n  - Drift ${named("drift", drift.id)}: Log gap · Model updated to match the code\n    - Proposal ${named("proposal", attached.id)} (draft): Repair log\n`);
    expect(board).not.toMatch(new RegExp(`^- Drift ${named("drift", drift.id)}`, "m"));
    expect(board).not.toContain("## In writing");
    expect(JSON.parse(out("--json", "board")).inWriting).toEqual([]);
  });
  test("automatic resolution Proposals persist their marker and accept only the delegated first code fix", () => {
    expect(() => run(["--root", dir, "proposal", "new", "Not a resolution", "--automatic"], process.cwd())).toThrow(/--automatic can only be used with --resolution/);
    const created = run(["--root", dir, "--json", "proposal", "new", "Automatic fix", "--resolution", "--automatic"], process.cwd());
    const id = JSON.parse(created.out).id as string;
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Repair", refs: ["order"], happens: "Code differs.", should: "Code follows the Model." });
    run(["--root", dir, "proposal", "resolve-drift", id, drift.id, "--decision", "fix-code", "--option", "1"], process.cwd());

    let proposal = getProposal(p, id);
    expect(proposal.data).toMatchObject({ kind: "resolution", automatic: true, drifts: [{ drift: drift.id, decision: "fix-code", option: 1 }] });
    expect(readFileSync(join(proposal.dir, "proposal.md"), "utf8")).toContain("automatic: true");
    expect(submitProposal(p, id).data.status).toBe("open");
    approveProposal(p, id);
    proposal = getProposal(p, id);
    expect(proposal.data).toMatchObject({ status: "approved", automatic: true });
    expect(run(["--root", dir, "--json", "proposal", "show", id], process.cwd()).out).toContain('"automatic": true');
  });

  test("automatic resolution validation and hand-over reject other decisions, options, notes, and file changes", () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Repair", refs: ["order"], happens: "Code differs.", should: "Code follows the Model." });
    const res = newProposal(p, "Automatic", "", { kind: "resolution", automatic: true });
    run(["--root", dir, "proposal", "resolve-drift", res.id, drift.id, "--decision", "fix-code", "--option", "1"], process.cwd());
    const proposalPath = join(res.dir, "proposal.md");
    const valid = readFileSync(proposalPath, "utf8");

    for (const [replacement, message] of [
      ["decision: proposal", "must use fix-code"],
      ["decision: fix-code\n    option: 2", "must use fix option 1"],
      ["decision: fix-code\n    option: 1\n    note: invented", "cannot have a note"],
    ] as const) {
      writeFileSync(proposalPath, valid.replace(/decision: fix-code\n    option: 1/, replacement));
      expect(validateProposal(p, getProposal(p, res.id)).map((d) => d.message).join("\n")).toContain(message);
      expect(() => submitProposal(p, res.id)).toThrow(new RegExp(message));
    }

    writeFileSync(proposalPath, valid);
    const copied = editInProposal(p, res.id, "checkout/order.md");
    writeFileSync(copied, readFileSync(copied, "utf8") + "\nchanged");
    expect(validateProposal(p, getProposal(p, res.id)).map((d) => d.message).join("\n")).toContain("cannot touch or delete Model or Requirements files");
    expect(() => submitProposal(p, res.id)).toThrow(/cannot touch or delete Model or Requirements files/);
    const unregisteredDrift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Unregistered", refs: ["order"], happens: "Code differs.", should: "Code follows the Model." });
    const unregistered = newProposal(p, "Automatic unregistered", "", { kind: "resolution", automatic: true });
    run(["--root", dir, "proposal", "resolve-drift", unregistered.id, unregisteredDrift.id, "--decision", "fix-code", "--option", "1"], process.cwd());
    const ghost = join(unregistered.dir, "model", "checkout", "ghost.md");
    mkdirSync(join(unregistered.dir, "model", "checkout"), { recursive: true });
    writeFileSync(ghost, "# Ghost\n");
    expect(validateProposal(p, getProposal(p, unregistered.id)).map((d) => d.message).join("\n")).toContain("cannot touch or delete Model or Requirements files");
    expect(() => submitProposal(p, unregistered.id)).toThrow(/cannot touch or delete Model or Requirements files/);
  });

  test("an attached Proposal shows under its Drift on the board, is marked in list and show, and returns to the lists once its Drift is resolved", async () => {
    const draft = newProposal(p, "Lost orders");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: draft.id, happens: "It writes off.", should: "It does not." });
    const out = (...a: string[]) => run(["--root", dir, ...a], process.cwd()).out;
    const dn = named("drift", drift.id);
    const pn = named("proposal", draft.id);
    const board = out("board");
    expect(board).toContain(`- Drift ${dn}: Lost in transit\n  - Proposal ${pn} (draft): Lost orders`);
    expect(board).not.toContain("## In writing");
    expect(JSON.parse(out("--json", "board")).inWriting).toEqual([]);
    expect(out("proposal", "list")).toContain(`(attached to ${dn})`);
    expect(out("proposal", "show", draft.id)).toContain(`Attached to Drift ${dn} Lost in transit`);

    writeFileSync(drift.path, "---\nstatus: resolved\nrefs: [order]\nproposal: " + draft.id + "\n---\n# Old\n\nFree text.\n");
    expect(out("board")).toContain("## In writing");
    expect(out("proposal", "list")).not.toContain("attached to");
    expect(out("proposal", "show", draft.id)).not.toContain("Attached to Drift");
  });

  test("drift show lists the fix options as a numbered list after the sides, then the chosen option and the note once the code is fixed; a Drift without options has no such block", async () => {
    const drift = newDrift(p, {
      options: [{ title: "Change the step", text: "Rewrite the **step**.\n\n- keeps data" }, { title: "Remove the step", text: "Drop it." }],
      title: "Refund",
      refs: ["order"],
      happens: "Refunds after pickup.",
      should: "No refund after pickup.",
      where: "`src/refund.ts`",
    });
    const show = () => run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    const listing = "## What should happen\n\nNo refund after pickup.\n\n## Fix options\n\n1. **Change the step** (recommended)\n\n   Rewrite the **step**.\n\n   - keeps data\n\n2. **Remove the step**\n\n   Drop it.\n\n## Where in the code\n\n`src/refund.ts`";
    expect(show()).toContain(listing);
    expect(show()).not.toMatch(/## Chosen option|## Note/);

    resolveDrift(p, drift.id, "fix-code", [], { option: 2, note: "Keep the log." });
    expect(show()).toMatch(/## Where in the code\n\n`src\/refund.ts`\n\n## Chosen option\n\n2\. Remove the step\n\n## Note\n\nKeep the log\.\n\nStatus: \*\*resolved\*\* \(fix-code\)/);
    expect(JSON.parse(run(["--root", dir, "--json", "drift", "show", drift.id], process.cwd()).out)).toMatchObject({ option: 2, note: "Keep the log.", options: [{ title: "Change the step" }, { title: "Remove the step" }] });

    const bare = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Bare", refs: ["order"], happens: "Code does it.", should: "Model says so." });
    writeFileSync(bare.path, readFileSync(bare.path, "utf8").replace(/\n## Fix options[\s\S]*/, "\n"));
    const shown = run(["--root", dir, "drift", "show", bare.id], process.cwd()).out;
    expect(shown).not.toMatch(/Fix options|Chosen option|## Note/);
    resolveDrift(p, bare.id, "fix-code", [], { note: "Only a note." });
    const noted = run(["--root", dir, "drift", "show", bare.id], process.cwd()).out;
    expect(noted).toContain("## Note\n\nOnly a note.");
    expect(noted).not.toContain("Chosen option");
  });

  test("a Drift with an attached Proposal cannot be dismissed whatever the Proposal's state; accepting names why it cannot be approved", () => {
    const proposal = newProposal(p, "Lost orders");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: proposal.id, happens: "Code writes it off.", should: "Nothing writes it off." });
    const dismiss = () => resolveDrift(p, drift.id, "dismiss");
    expect(dismiss).toThrow(new RegExp(`accept that Proposal.*fix the code`));
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/still being written/);
    handOver(p, proposal.id);
    rejectProposal(p, proposal.id, "No.");
    expect(dismiss).toThrow(/accept that Proposal/);
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/rejected/);
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "open", resolution: null });
  });

  test("approving or rejecting a Proposal attached to an open Drift is refused and changes nothing; accepting through the Drift works; a resolved Drift lets go", () => {
    const proposal = newProposal(p, "Lost orders");
    handOver(p, proposal.id);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: proposal.id, happens: "Code writes it off.", should: "Nothing writes it off." });
    const refusal = `Proposal ${named("proposal", proposal.id)} is attached to Drift ${named("drift", drift.id)}: decide on the Drift with trama drift resolve`;
    for (const verb of ["approve", "reject"]) expect(() => run(["--root", dir, "proposal", verb, proposal.id], process.cwd())).toThrow(refusal);
    expect(getProposal(p, proposal.id).data.status).toBe("open");
    expect(getProposal(p, proposal.id).body).not.toContain("## Feedback");

    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, proposal.id).data.status).toBe("approved");

    const left = newProposal(p, "Left open");
    handOver(p, left.id);
    const done = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Other", refs: ["order"], proposal: left.id, happens: "Code does it.", should: "Model says so." });
    resolveDrift(p, done.id, "fix-code", [], { option: 1 });
    expect(getProposal(p, left.id).data.status).toBe("rejected");
    expect(getDrift(p, done.id).data.proposal).toBeNull();
    expect(getDrift(p, drift.id).data.proposal).toBeNull();
    expect(() => run(["--root", dir, "proposal", "reject", left.id], process.cwd())).toThrow(/is rejected/);
  });

  test("discarding a Draft attached to an open Drift from the command line works and leaves the Drift as it is; the Drift can still be fixed afterwards", () => {
    const draft = newProposal(p, "Half written");
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Half done", refs: ["order"], proposal: draft.id, happens: "Code does it.", should: "Model says so." });
    expect(run(["--root", dir, "proposal", "discard", draft.id], process.cwd(), {}).out).toContain("Discarded Proposal");
    expect(getProposal(p, draft.id).data.status).toBe("discarded");
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "open", proposal: draft.id });

    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    expect(getProposal(p, draft.id).data.status).toBe("discarded");
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "resolved", proposal: null });
  });

  test("a Drift takes only a Draft or open Proposal not held by another open Drift; a resolved Drift lets go", () => {
    const attach = (proposal: string) => newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Lost", refs: ["order"], proposal, happens: "Code does it.", should: "Model says so." });
    const release = (d: { path: string }) => writeFileSync(d.path, readFileSync(d.path, "utf8").replace("status: open", "status: resolved"));
    const draft = newProposal(p, "Draft one");
    const first = attach(draft.id);
    expect(() => attach(draft.id)).toThrow(new RegExp(`already attached to Drift ${named("drift", first.id)}`));
    release(first);
    expect(attach(draft.id).data.proposal).toBe(draft.id);
    discardProposal(p, draft.id);
    expect(() => attach(draft.id)).toThrow(/was discarded/);

    const open = newProposal(p, "Open one");
    handOver(p, open.id);
    expect(attach(open.id).data.proposal).toBe(open.id);
    expect(() => attach(open.id)).toThrow(/already attached/);

    const done = newProposal(p, "Done one");
    editOrder(done.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    coverWithTask(p, done.id, "checkout");
    handOver(p, done.id);
    approveProposal(p, done.id);
    expect(() => attach(done.id)).toThrow(/was approved/);
  });
});

describe("CLI", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd());

  test("validate exits 1 with the error listed when the Model is invalid", () => {
    writeFileSync(modelFile("checkout/cart.md"), "# Cart\n\n## States\n\n### A\n");
    const { out, exit } = cli("validate");
    expect(exit).toBe(1);
    expect(out).toContain("checkout/cart.md");
    expect(out).toContain("exactly one (initial) State");
  });

  test("a Proposal written through the command line is validated before submit and leaves the Model untouched; paths outside the Model are refused", () => {
    const before = readFileSync(modelFile("checkout/order.md"), "utf8");
    const created = cli("proposal", "new", "Lost parcels", "--body", "Couriers lose parcels.").out;
    const id = /Created Draft Proposal (P\d+)/.exec(created)?.[1] ?? "";
    const file = cli("proposal", "edit", id, "checkout/order.md").out.split("\n")[0] as string;
    writeFileSync(file, before.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)").replace("→ Paid", "→ Nowhere"));
    expect(() => cli("proposal", "submit", id)).toThrow(/Nowhere/);
    expect(readFileSync(modelFile("checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, id, true).data.status).toBe("draft");
    expect(() => cli("proposal", "edit", id, "../../escape.md")).toThrow();
    expect(existsSync(join(dir, "escape.md"))).toBe(false);
  });

  test("--json prints the same data as a parseable document", () => {
    const { out } = cli("--json", "event", "user.CANCEL");
    expect(JSON.parse(out)).toMatchObject({ owner: "user", ownerKind: "actor", receivers: [{ machine: "order", state: "Paid" }, { machine: "order", state: "Paid" }] });
  });

  test("usage problems throw UsageError (exit 2), domain problems TramaError (exit 1)", () => {
    expect(() => cli("machine")).toThrow(/Usage: trama machine <machine>/);
    expect(() => cli("machine", "order", "--bogus")).toThrow(/Unknown option/);
    expect(() => cli("proposal", "frobnicate")).toThrow(/Unknown command/);
    expect(() => cli("machine", "ghost")).toThrow(/Unknown Machine "ghost"/);
  });

  test("agent decision commands use the same domain checks as developer commands", () => {
    const agent = { TRAMA_AGENT: "1" };
    const lost = newProposal(p, "Lost");
    editOrder(lost.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    handOver(p, lost.id);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "d", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(run(["--root", dir, "proposal", "reject", lost.id, "--feedback", "no"], dir, agent).exit).toBe(0);
    expect(getProposal(p, lost.id).data.status).toBe("rejected");
    expect(getProposal(p, lost.id).body).toContain("no");
    expect(run(["--root", dir, "drift", "resolve", drift.id, "--dismiss"], dir, { CURSOR_AGENT: "1" }).exit).toBe(0);
    expect(getDrift(p, drift.id).data.status).toBe("resolved");
    const draft = newProposal(p, "Unfinished");
    expect(run(["--root", dir, "proposal", "discard", draft.id], dir, agent).exit).toBe(0);
    expect(getProposal(p, draft.id, true).data.status).toBe("discarded");
    expect(() => run(["--root", dir, "proposal", "approve", lost.id], dir, agent)).toThrow(/only open Proposals/);
    const taken = newTask(p, { title: "Taken", refs: ["order"], technical: false });
    moveTask(p, taken.id, "doing", "agent");
    expect(run(["--root", dir, "task", "take-back", taken.id], dir, agent).exit).toBe(0);
    expect(getTask(p, taken.id).data.agent).toBe(false);
  });

  test("drift resolve demands exactly one resolution", () => {
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "d", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => cli("drift", "resolve", drift.id)).toThrow(/exactly one/);
    expect(() => cli("drift", "resolve", drift.id, "--dismiss", "--fix-code")).toThrow(/exactly one/);
  });

  test("init refuses to overwrite and creates a valid empty Model", () => {
    const fresh = mkdtempSync(join(tmpdir(), "trama-init-"));
    try {
      expect(run(["--root", fresh, "init"], fresh).exit).toBe(0);
      expect(run(["--root", fresh, "validate"], fresh).exit).toBe(0);
      expect(() => run(["--root", fresh, "init"], fresh)).toThrow(/already exists/);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
