import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { handOver } from "./handover";
import { approveProposal, editInProposal, getProposal, health, newProposal, rejectProposal } from "../src/core/proposals";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { driftOptions, driftSides, getDrift, getTask, listDrifts, listTasks, moveTask, newDrift, newTask, releaseTasks, replaceDriftProposal, resolveDrift, takeBackTask } from "../src/core/work";

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
    expect(run(["--root", dir, "task", "show", linked.id], process.cwd()).out).toContain(`from Proposal ${prop.id}`);

    const plain = newTask(p, { title: "Plain", refs: ["order"], technical: false });
    const text = readFileSync(plain.path, "utf8").replace(/^proposal:.*\n/m, "");
    writeFileSync(plain.path, text);
    expect(getTask(p, plain.id).data.proposal).toBeNull();
  });

  test("a Technical Task is never part of a design, even when a Proposal is given", () => {
    const prop = newProposal(p, "Returns");
    expect(() => newTask(p, { title: "x", refs: [], technical: true, proposal: "42" })).toThrow(/No Proposal/);
    const tech = newTask(p, { title: "Upgrade", refs: [], technical: true, proposal: prop.id });
    const a = newTask(p, { title: "A", refs: ["order"], technical: false, proposal: prop.id });
    const b = newTask(p, { title: "B", refs: ["order"], technical: false, proposal: prop.id });
    expect(getTask(p, tech.id).data.proposal).toBeNull();
    const board = run(["--root", dir, "board"], process.cwd()).out;
    expect(board).toContain(`Proposal ${prop.id} "Returns" (0/2 done)`);
    expect(board).toContain(`  - ${a.id} A [todo]`);
    expect(board).toContain(`  - ${b.id} B [todo]`);
    expect(board).toContain(`\n- ${tech.id} Upgrade (technical)`);
  });

  test("the agent takes a Task by moving it to In progress; the developer cannot move it until it is released", () => {
    const task = (): string => newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const id = task();
    expect(moveTask(p, id, "doing", "developer").data.agent).toBe(false);
    moveTask(p, id, "todo", "developer");

    expect(moveTask(p, id, "doing", "agent").data).toMatchObject({ column: "doing", agent: true });
    expect(getTask(p, id).data.agent).toBe(true);
    for (const column of ["todo", "doing", "done"]) expect(() => moveTask(p, id, column, "developer")).toThrow(/agent is working on Task .*take-back/);
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: true });

    expect(moveTask(p, id, "doing", "agent").data.agent).toBe(true);
    expect(moveTask(p, id, "done", "agent").data).toMatchObject({ column: "done", agent: false });
    expect(moveTask(p, id, "doing", "agent").data.agent).toBe(true);
    expect(moveTask(p, id, "todo", "agent").data).toMatchObject({ column: "todo", agent: false });
    expect(moveTask(p, id, "done", "developer").data.column).toBe("done");
  });

  test("the agent cannot start a blocked Task, from any column; the developer and the agent's other moves are free", async () => {
    const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], origin: id, happens: "The code does it one way.", should: "The Model says another." });
    const agent = (column: string) => run(["--root", dir, "task", "move", id, column], process.cwd(), { TRAMA_AGENT: "1" });

    expect(() => moveTask(p, id, "doing", "agent")).toThrow(new RegExp(`Drift ${drift.id} "Refunds differ".*developer must decide`));
    expect(() => agent("doing")).toThrow(/Drift .* "Refunds differ"/);
    expect(getTask(p, id).data).toMatchObject({ column: "todo", agent: false });

    expect(moveTask(p, id, "doing", "developer").data).toMatchObject({ column: "doing", agent: false });
    expect(() => moveTask(p, id, "doing", "agent")).toThrow(/blocked/);
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    expect(moveTask(p, id, "done", "agent").data.column).toBe("done");
    expect(moveTask(p, id, "doing", "agent").data).toMatchObject({ column: "doing", agent: true });
    expect(moveTask(p, id, "todo", "agent").data.column).toBe("todo");

    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, drift.id).data.task as string;
    expect(() => moveTask(p, id, "doing", "agent")).toThrow(new RegExp(`Task ${fix} .*fixes the code for Drift ${drift.id}`));
  });

  test("fixing the code of a Drift sends its origin Task back to To do, waiting for the fix; other resolutions leave it", () => {
    const origin = (column: "doing" | "done") => {
      const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
      moveTask(p, id, column, "agent");
      return id;
    };
    const drift = (id: string | undefined) => newDrift(p, { options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], origin: id, happens: "The code does it one way.", should: "The Model says another." }).id;

    const working = origin("doing");
    const fixed = resolveDrift(p, drift(working), "fix-code", [], { option: 1 });
    expect(getTask(p, working).data).toMatchObject({ column: "todo", agent: false });
    expect(() => moveTask(p, working, "doing", "agent")).toThrow(new RegExp(`Task ${fixed.data.task} `));
    moveTask(p, fixed.data.task as string, "done", "developer");
    expect(moveTask(p, working, "doing", "agent").data.agent).toBe(true);

    const finished = origin("done");
    resolveDrift(p, drift(finished), "fix-code", [], { option: 1 });
    expect(getTask(p, finished).data.column).toBe("done");

    const dismissedOrigin = origin("doing");
    resolveDrift(p, drift(dismissedOrigin), "dismiss");
    expect(getTask(p, dismissedOrigin).data).toMatchObject({ column: "doing", agent: true });

    const noOrigin = origin("doing");
    resolveDrift(p, drift(undefined), "fix-code", [], { option: 1 });
    expect(getTask(p, noOrigin).data).toMatchObject({ column: "doing", agent: true });
  });

  test("taking back clears the mark, keeps the Task In progress, and is the developer's command", () => {
    const id = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    expect(() => takeBackTask(p, id)).toThrow(/has not taken/);
    moveTask(p, id, "doing", "agent");
    const cli = (env: Record<string, string>) => run(["--root", dir, "task", "take-back", id], process.cwd(), env);

    expect(() => cli({ TRAMA_AGENT: "1" })).toThrow(/developer's decision.*TRAMA_AGENT/);
    expect(getTask(p, id).data.agent).toBe(true);
    cli({});
    expect(getTask(p, id).data).toMatchObject({ column: "doing", agent: false });
    expect(moveTask(p, id, "done", "developer").data.column).toBe("done");
  });

  test("releasing frees every taken Task and leaves each one where it is", () => {
    const [a, b, c] = [1, 2, 3].map(() => newTask(p, { title: "T", refs: ["order"], technical: false }).id) as [string, string, string];
    moveTask(p, a, "doing", "agent");
    moveTask(p, b, "doing", "developer");
    expect(releaseTasks(p).map((t) => t.id)).toEqual([a]);
    expect([a, b, c].map((id) => getTask(p, id).data)).toMatchObject([
      { column: "doing", agent: false },
      { column: "doing", agent: false },
      { column: "todo", agent: false },
    ]);
    expect(moveTask(p, a, "done", "developer").data.column).toBe("done");
    expect(releaseTasks(p)).toEqual([]);
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
    expect(board).toContain(`- ${taken} Taken (agent working)\n`);
    expect(board).toContain(`  - ${a} In design (agent working) [doing]`);
    expect(board).toContain(`- ${free} Free\n`);
    expect(board).not.toContain(`${b} Other in design (agent working)`);
    expect(cli("task", "list")).toContain(`- ${taken} Taken (agent working)`);
    expect(cli("task", "list")).not.toContain(`${free} Free (agent working)`);
    expect(cli("task", "show", taken)).toContain("(agent working)");
    expect(cli("task", "show", free)).not.toContain("(agent working)");
    expect(JSON.parse(run(["--root", dir, "--json", "task", "list"], process.cwd(), {}).out).tasks.find((t: { id: string }) => t.id === taken).agent).toBe(true);
  });

  test("a blocked Task is marked in the board, the task list and task show, with every blocker; Drift views list no Tasks", async () => {
    const blockedTask = newTask(p, { title: "Return flow", refs: ["order"], technical: false }).id;
    const waiting = newTask(p, { title: "Waiting flow", refs: ["cart"], technical: false }).id;
    const free = newTask(p, { title: "Free flow", refs: ["payment"], technical: false }).id;
    const d1 = newDrift(p, { options: FIX_OPTIONS, title: "Refunds differ", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    const d2 = newDrift(p, { options: FIX_OPTIONS, title: "Cancel differs", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another." });
    const d3 = newDrift(p, { options: FIX_OPTIONS, title: "Waiting origin", refs: ["cart"], origin: waiting, happens: "The code does it one way.", should: "The Model says another." });
    resolveDrift(p, d3.id, "fix-code", [], { option: 1 });
    const fix = getDrift(p, d3.id).data.task as string;
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), {});

    const marks = ` (blocked by Drift ${d1.id}) (blocked by Drift ${d2.id})`;
    expect(cli("board").out).toContain(`- ${blockedTask} Return flow${marks}\n`);
    expect(cli("board").out).toContain(`- ${waiting} Waiting flow (waiting for Task ${fix})\n`);
    expect(cli("board").out).toContain(`- ${free} Free flow\n`);
    expect(cli("task", "list").out).toContain(`- ${blockedTask} Return flow${marks}`);
    const shown = cli("task", "show", blockedTask).out;
    expect(shown).toContain(`${marks}\nBlocked by Drift ${d1.id}: Refunds differ\nBlocked by Drift ${d2.id}: Cancel differs`);
    expect(cli("task", "show", waiting).out).toContain(`Waiting for Task ${fix}: Fix code to match the Model: Waiting origin`);
    expect(cli("task", "show", free).out).not.toContain("locked");
    const json = JSON.parse(cli("--json", "task", "list").out).tasks.find((t: { id: string }) => t.id === blockedTask);
    expect(json.blockedBy.map((b: { drift: string }) => b.drift)).toEqual([d1.id, d2.id]);

    moveTask(p, blockedTask, "done", "developer");
    expect(cli("task", "list").out).not.toContain(`${blockedTask} Return flow (blocked`);
    const driftView = cli("drift", "show", d1.id).out;
    expect(driftView).not.toContain(blockedTask);
    expect(driftView).not.toContain("locked");
  });

  test("the command line takes the Task only inside the terminal Trama started", async () => {
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
  });

  test("the textual board shows a design once with its Tasks, while task list stays flat", () => {
    const cli = (...args: string[]) => run(["--root", dir, ...args], process.cwd());
    const prop = newProposal(p, "Returns");
    const mk = (title: string, proposal?: string) => newTask(p, { title, refs: ["order"], technical: false, proposal }).id;
    const [a, b, c] = [mk("Return request", prop.id), mk("Refund on return", prop.id), mk("Return label", prop.id)];
    mk("Alone");
    const single = newProposal(p, "Lonely");
    mk("Only one", single.id);
    cli("task", "move", a as string, "done");
    cli("task", "move", b as string, "doing");

    const board = cli("board").out;
    expect(board).toContain(`## In progress\n- Proposal ${prop.id} "Returns" (1/3 done)\n  - ${a} Return request [done]\n  - ${b} Refund on return [doing]\n  - ${c} Return label [todo]`);
    expect(board.match(new RegExp(`Proposal ${prop.id} "Returns"`, "g"))).toHaveLength(1);
    expect(board).toMatch(/## To do\n- \d+ Alone\n- \d+ Only one\n/);

    const list = cli("task", "list", "--column", "todo").out;
    expect(list).toContain(`- ${c} Return label (Proposal ${prop.id})`);
    expect(list).not.toContain("Refund on return");
    const json = JSON.parse(cli("--json", "board").out) as { doing: { kind: string; total?: number }[] };
    expect(json.doing[0]).toMatchObject({ kind: "design", total: 3 });
  });

  test("resolving a Drift with fix-code creates a linked Task with the same references", () => {
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Seen in refund.ts", should: "The Model says another." });
    const resolved = resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    const task = getTask(p, resolved.data.task as string);
    expect(task.data).toMatchObject({ column: "todo", refs: ["order/Shipped"], drift: drift.id, technical: false });
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "resolved", resolution: "fix-code" });
    expect(() => resolveDrift(p, drift.id, "dismiss")).toThrow(/already resolved/);
  });

  test("fixing the code of a Drift with options needs one of them; the Task carries it with the note, and the Drift keeps both", () => {
    const make = (where?: string) => newDrift(p, { options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Refunds after pickup.", should: "No refund after pickup.", ...(where ? { where } : {}) });
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
      const d = newDrift(p, { options: FIX_OPTIONS, title, refs: ["order"], happens: "Code does it.", should: "Model says so." });
      writeFileSync(d.path, readFileSync(d.path, "utf8").replace(/\n## Fix options[\s\S]*/, "\n"));
      return d;
    };
    const old = bare("Old");
    expect(() => resolveDrift(p, old.id, "fix-code", [], { option: 1 })).toThrow(/no fix options/);
    const fixed = resolveDrift(p, old.id, "fix-code", [], { note: "Careful." });
    expect(getDrift(p, old.id).data).toMatchObject({ option: null, note: "Careful." });
    expect(getTask(p, fixed.data.task as string).body).toBe("# Fix code to match the Model: Old\n\n## What happens\n\nCode does it.\n\n## What should happen\n\nModel says so.\n\n## Note\n\nCareful.\n");
    expect(getDrift(p, bare("Plain").id).data.note).toBeNull();
    resolveDrift(p, "0002", "fix-code");
    expect(getDrift(p, "0002").data).toMatchObject({ resolution: "fix-code", option: null, note: null });

    const prop = newProposal(p, "Model forgot this");
    editOrder(prop.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    const withProposal = newDrift(p, { options: FIX_OPTIONS, title: "Lost", refs: ["order"], proposal: prop.id, happens: "Code does it.", should: "Model says so." });
    handOver(p, prop.id);
    const plain = newDrift(p, { options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "Code does it.", should: "Model says so." });
    for (const choice of [{ option: 1 }, { note: "Why." }]) {
      expect(() => resolveDrift(p, withProposal.id, "accept-proposal", [], choice)).toThrow(/only goes with fixing the code/);
      expect(() => resolveDrift(p, plain.id, "dismiss", [], choice)).toThrow(/only goes with fixing the code/);
    }
    expect(getProposal(p, prop.id).data.status).toBe("open");
    expect(getDrift(p, plain.id).data.status).toBe("open");
    expect(resolveDrift(p, plain.id, "dismiss").data.resolution).toBe("dismissed");
  });

  test("drift resolve --fix-code takes --option and --note on the command line; the other resolutions refuse them", () => {
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Refund too late", refs: ["order/Shipped"], happens: "Refunds after pickup.", should: "No refund after pickup." });
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
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: prop.id, happens: "The code does it one way.", should: "The Model says another." });
    handOver(p, prop.id);
    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, prop.id).data.status).toBe("approved");
    expect(loadModel(p).machines.get("order")?.states.some((s) => s.name === "Lost")).toBe(true);
  });

  test("accepting without an attached Proposal fails and leaves the Drift open", () => {
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/no attached Proposal/);
    expect(getDrift(p, drift.id).data.status).toBe("open");
  });

  test("a Drift remembers the Task it was filed from, which must exist; Drifts without one still load", async () => {
    const task = newTask(p, { title: "Cancel flow", refs: ["order"], technical: false });
    expect(() => newDrift(p, { options: FIX_OPTIONS, title: "x", refs: ["order"], origin: "42", happens: "The code does it one way.", should: "The Model says another." })).toThrow(/No Task/);
    const viaCore = newDrift(p, { options: FIX_OPTIONS, title: "Core", refs: ["order"], origin: task.id, happens: "The code does it one way.", should: "The Model says another." });
    expect(getDrift(p, viaCore.id).data.origin).toBe(task.id);

    const viaCli = run(["--root", dir, "drift", "new", "Cli", "--ref", "order", "--task", task.id, "--happens", "Code does it.", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd());
    const cliId = /Created Drift (\d+)/.exec(viaCli.out)?.[1] ?? "";
    expect(getDrift(p, cliId).data.origin).toBe(task.id);

    expect(() => run(["--root", dir, "drift", "new", "Missing", "--ref", "order", "--task", "42", "--happens", "Code does it.", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd())).toThrow(/No Task/);

    const scanned = newDrift(p, { options: FIX_OPTIONS, title: "From a scan", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(getDrift(p, scanned.id).data.origin).toBeNull();
    writeFileSync(scanned.path, readFileSync(scanned.path, "utf8").replace(/^origin:.*\n/m, ""));
    expect(getDrift(p, scanned.id).data.origin).toBeNull();
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
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Two sides", refs: ["order"], happens: " Refunds after pickup. ", should: "No refund after pickup." });
    expect(drift.body).toBe(
      "# Two sides\n\n## What happens\n\nRefunds after pickup.\n\n## What should happen\n\nNo refund after pickup.\n\n## Fix options\n\n### Change the code\n\nMake the code do what the Model says.\n\n### Remove the code\n\nDrop the behaviour altogether.\n",
    );
    expect(driftSides(getDrift(p, drift.id))).toEqual({ happens: "Refunds after pickup.", should: "No refund after pickup.", where: null });

    expect(() => newDrift(p, { options: FIX_OPTIONS, title: "x", refs: ["order"], happens: "  ", should: "Model says so." })).toThrow(/"What happens"/);
    expect(() => newDrift(p, { options: FIX_OPTIONS, title: "x", refs: ["order"], happens: "Code does it.", should: "" })).toThrow(/"What should happen"/);
    expect(() => run(["--root", dir, "drift", "new", "x", "--ref", "order", "--should", "Model says so.", ...CLI_OPTIONS], process.cwd())).toThrow(/"What happens"/);
    expect(listDrifts(p)).toHaveLength(1);

    writeFileSync(drift.path, "---\nstatus: resolved\nrefs: [order]\n---\n# Old\n\nFree text.\n");
    expect(driftSides(getDrift(p, drift.id))).toBeNull();
  });

  test("a new Drift needs two to five distinct fix options, each with title and text, in the order given, from core and command line", async () => {
    const file = (options: { title: string; text: string }[]) => newDrift(p, { title: "x", refs: ["order"], happens: "Code does it.", should: "Model says so.", options });
    const five = ["A", "B", "C", "D", "E"].map((t) => ({ title: t, text: `Way ${t}.` }));
    expect(driftOptions(file(five))).toEqual(five);
    const kept = getDrift(p, "0001");
    expect(driftOptions(kept).map((o) => o.title)).toEqual(["A", "B", "C", "D", "E"]);
    expect(driftSides(kept)).toMatchObject({ should: "Model says so.", where: null });

    expect(() => file([])).toThrow(/from 2 to 5 fix options.*found 0/);
    expect(() => file(FIX_OPTIONS.slice(0, 1))).toThrow(/from 2 to 5 fix options.*found 1/);
    expect(() => file([...five, { title: "F", text: "Way F." }])).toThrow(/from 2 to 5 fix options.*found 6/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "", text: "Way B." }])).toThrow(/Fix option 2 needs its title/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "B", text: " " }])).toThrow(/Fix option 2 \("B"\) needs its text/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: " A ", text: "Way B." }])).toThrow(/Two fix options are titled "A"/);
    expect(() => file([{ title: "A", text: "Way A." }, { title: "B", text: "Way B.\n### C\nWay C." }])).toThrow(/cannot contain headings/);
    expect(listDrifts(p)).toHaveLength(1);

    const args = ["--root", dir, "drift", "new", "Cli", "--ref", "order", "--happens", "Code does it.", "--should", "Model says so."];
    expect(() => run([...args, "--option", "A", "--option-text", "Way A."], process.cwd())).toThrow(/from 2 to 5 fix options.*found 1/);
    expect(() => run([...args, "--option", "A", "--option-text", "Way A.", "--option", "B"], process.cwd())).toThrow(/Fix option 2 \("B"\) needs its text/);
    expect(() => run([...args, "--option", "A", "--option-text", "Way A.", "--option-text", "Way B."], process.cwd())).toThrow(/Fix option 2 needs its title/);
    expect(() => run(args, process.cwd())).toThrow(/from 2 to 5 fix options.*found 0/);
    const created = /Created Drift (\d+)/.exec(run([...args, ...CLI_OPTIONS], process.cwd()).out)?.[1] ?? "";
    expect(driftOptions(getDrift(p, created))).toEqual(FIX_OPTIONS);

    const three = run([...args, ...five.slice(0, 3).flatMap((o) => ["--option", o.title, "--option-text", o.text])], process.cwd()).out;
    expect(driftOptions(getDrift(p, /Created Drift (\d+)/.exec(three)?.[1] ?? ""))).toEqual(five.slice(0, 3));
  });

  test("drift show lists the two sides as two blocks, says why an attached Proposal cannot be approved, and shows an old Drift as one block", async () => {
    const draft = newProposal(p, "Lost orders");
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: draft.id, happens: "worker/lost.ts writes it off.", should: "Nothing writes it off." });
    const shown = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(shown).toContain("## What happens\n\nworker/lost.ts writes it off.\n\n## What should happen\n\nNothing writes it off.");
    expect(shown).toContain(`Attached Proposal: ${draft.id} (draft)\nCannot be approved: Proposal ${draft.id} is still being written.`);
    expect(shown).not.toContain("Description");
    const json = JSON.parse(run(["--root", dir, "--json", "drift", "show", drift.id], process.cwd()).out);
    expect(json).toMatchObject({ happens: "worker/lost.ts writes it off.", should: "Nothing writes it off.", proposalBlock: { kind: "draft" } });

    writeFileSync(drift.path, "---\nstatus: resolved\nrefs: [order]\nproposal: null\n---\n# Old\n\nFree text.\n");
    const old = run(["--root", dir, "drift", "show", drift.id], process.cwd()).out;
    expect(old).toContain("## Description\n\nFree text.");
    expect(old).not.toContain("What happens");
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

    const bare = newDrift(p, { options: FIX_OPTIONS, title: "Bare", refs: ["order"], happens: "Code does it.", should: "Model says so." });
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
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: proposal.id, happens: "Code writes it off.", should: "Nothing writes it off." });
    const dismiss = () => resolveDrift(p, drift.id, "dismiss");
    expect(dismiss).toThrow(new RegExp(`accept that Proposal.*fix the code`));
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/still being written/);
    handOver(p, proposal.id);
    rejectProposal(p, proposal.id, "No.");
    expect(dismiss).toThrow(/accept that Proposal/);
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/rejected/);
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "open", resolution: null });
  });

  test("the agent replaces a Drift's stale Proposal: the new one is attached, the old one is rejected as replaced, and nothing else qualifies", async () => {
    const old = newProposal(p, "Lost orders");
    editOrder(old.id, (t) => `${t}\n`);
    handOver(p, old.id);
    const drift = newDrift(p, { options: FIX_OPTIONS, title: "Lost in transit", refs: ["order"], proposal: old.id, happens: "Code writes it off.", should: "Nothing writes it off." });
    const fresh = newProposal(p, "Lost orders again");
    const asAgent = (...args: string[]) => run(["--root", dir, ...args], process.cwd(), { TRAMA_AGENT: "1" });

    expect(() => replaceDriftProposal(p, drift.id, fresh.id)).toThrow(/not stale/);
    appendFileSync(modelFile("checkout/order.md"), "\n");
    expect(() => replaceDriftProposal(p, drift.id, old.id)).toThrow(/already attached/);
    expect(() => replaceDriftProposal(p, drift.id, "99")).toThrow(/No Proposal/);
    const turnedDown = newProposal(p, "Turned down");
    handOver(p, turnedDown.id);
    rejectProposal(p, turnedDown.id, "No.");
    expect(() => replaceDriftProposal(p, drift.id, turnedDown.id)).toThrow(/was rejected/);
    expect(getProposal(p, old.id).data.status).toBe("open");

    const out = asAgent("drift", "replace-proposal", drift.id, "--proposal", fresh.id).out;
    expect(out).toContain(`Proposal ${fresh.id}`);
    expect(getDrift(p, drift.id).data.proposal).toBe(fresh.id);
    expect(getProposal(p, old.id).data.status).toBe("rejected");
    expect(getProposal(p, old.id).body).toContain(`## Feedback\n\nReplaced by Proposal ${fresh.id}`);
    expect(() => replaceDriftProposal(p, drift.id, turnedDown.id)).toThrow(/only an open, stale Proposal/);

    resolveDrift(p, drift.id, "fix-code", [], { option: 1 });
    expect(() => asAgent("drift", "replace-proposal", drift.id, "--proposal", fresh.id)).toThrow();
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
    cli("proposal", "new", "Lost parcels", "--body", "Couriers lose parcels.");
    const file = cli("proposal", "edit", "1", "checkout/order.md").out.split("\n")[0] as string;
    writeFileSync(file, before.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)").replace("→ Paid", "→ Nowhere"));
    expect(() => cli("proposal", "submit", "1")).toThrow(/Nowhere/);
    expect(readFileSync(modelFile("checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, "1").data.status).toBe("draft");
    expect(() => cli("proposal", "edit", "1", "../../escape.md")).toThrow();
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

  test("an agent (TRAMA_AGENT set) cannot approve, reject or resolve; the developer can", () => {
    const agent = { TRAMA_AGENT: "1" };
    const lost = newProposal(p, "Lost");
    editOrder(lost.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    handOver(p, lost.id);
    newDrift(p, { options: FIX_OPTIONS, title: "d", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => run(["--root", dir, "proposal", "approve", "1"], dir, agent)).toThrow(/developer's decision/);
    expect(() => run(["--root", dir, "proposal", "reject", "1", "--feedback", "no"], dir, agent)).toThrow(/developer's decision/);
    expect(() => run(["--root", dir, "drift", "resolve", "1", "--dismiss"], dir, agent)).toThrow(/developer's decision/);
    expect(getProposal(p, "1").data.status).toBe("open");
    expect(getDrift(p, "1").data.status).toBe("open");
    expect(run(["--root", dir, "proposal", "list"], dir, agent).exit).toBe(0);
    expect(run(["--root", dir, "proposal", "approve", "1"], dir, {}).exit).toBe(0);
  });

  test("drift resolve demands exactly one resolution", () => {
    newDrift(p, { options: FIX_OPTIONS, title: "d", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => cli("drift", "resolve", "1")).toThrow(/exactly one/);
    expect(() => cli("drift", "resolve", "1", "--dismiss", "--fix-code")).toThrow(/exactly one/);
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
