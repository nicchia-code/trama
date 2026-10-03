import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, health, newProposal, rejectProposal } from "../src/core/proposals";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { callTool } from "../src/tools/catalog";
import { getDrift, getTask, moveTask, newDrift, newTask, releaseTasks, resolveDrift, takeBackTask } from "../src/core/work";

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
    expect(health(p, getProposal(p, prop.id)).stale).toEqual(["checkout/order.md"]);
    expect(() => approveProposal(p, prop.id)).toThrow(/stale/);
  });

  test("a new file goes stale when someone creates the same file in the Model first", () => {
    const prop = newProposal(p, "Collision");
    writeFileSync(editInProposal(p, prop.id, "checkout/returns.md"), "# R\n\n## States\n\n### A (initial)\n");
    writeFileSync(modelFile("checkout/returns.md"), "# Other\n\n## States\n\n### B (initial)\n");
    expect(() => approveProposal(p, prop.id)).toThrow(/stale/);
  });

  test("an invalid result is refused and leaves the Model untouched", () => {
    const prop = newProposal(p, "Broken");
    editOrder(prop.id, (t) => t.replace("→ Paid", "→ Nowhere"));
    const before = readFileSync(modelFile("checkout/order.md"), "utf8");
    expect(() => approveProposal(p, prop.id)).toThrow(/unknown State "Nowhere"/);
    expect(readFileSync(modelFile("checkout/order.md"), "utf8")).toBe(before);
    expect(getProposal(p, prop.id).data.status).toBe("open");
  });

  test("a Model file dropped into the Proposal by hand, without `proposal edit`, is refused", () => {
    const prop = newProposal(p, "Sneaky");
    mkdirSync(join(prop.dir, "model", "checkout"), { recursive: true });
    writeFileSync(join(prop.dir, "model", "checkout", "ghost.md"), "# G\n\n## States\n\n### A (initial)\n");
    expect(() => approveProposal(p, prop.id)).toThrow(/never registered: checkout\/ghost\.md/);
    expect(existsSync(modelFile("checkout/ghost.md"))).toBe(false);
  });

  test("rejecting keeps the feedback and blocks later approval", () => {
    const prop = newProposal(p, "Nope");
    rejectProposal(p, prop.id, "Split it up.");
    const again = getProposal(p, prop.id);
    expect(again.data.status).toBe("rejected");
    expect(again.body).toContain("## Feedback\n\nSplit it up.");
    expect(() => approveProposal(p, prop.id)).toThrow(/rejected/);
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

  test("a taken Task is marked (agent working) in the board, the task list, task show and the agent tools", () => {
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
    expect(callTool(p, "trama_board", {}).text).toContain(`${taken} Taken (agent working)`);
    expect(callTool(p, "trama_task_show", { task: taken }).text).toContain("(agent working)");
    expect(JSON.parse(run(["--root", dir, "--json", "task", "list"], process.cwd(), {}).out).tasks.find((t: { id: string }) => t.id === taken).agent).toBe(true);
  });

  test("the command line takes the Task only inside the terminal Trama started, and the agent tools always do", () => {
    const run2 = (env: Record<string, string>, ...args: string[]) => run(["--root", dir, "task", "move", ...args], process.cwd(), env);
    const [a, b, c] = [1, 2, 3].map(() => newTask(p, { title: "T", refs: ["order"], technical: false }).id) as [string, string, string];

    run2({}, a, "doing");
    expect(getTask(p, a).data.agent).toBe(false);

    run2({ TRAMA_AGENT: "1" }, b, "doing");
    expect(getTask(p, b).data.agent).toBe(true);
    expect(() => run2({}, b, "done")).toThrow(/agent is working on Task/);
    run2({ TRAMA_AGENT: "1" }, b, "done");
    expect(getTask(p, b).data).toMatchObject({ column: "done", agent: false });

    expect(callTool(p, "trama_task_move", { task: c, column: "doing" }).isError).toBe(false);
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
    const drift = newDrift(p, { title: "Refund too late", refs: ["order/Shipped"], body: "Seen in refund.ts" });
    const resolved = resolveDrift(p, drift.id, "fix-code");
    const task = getTask(p, resolved.data.task as string);
    expect(task.data).toMatchObject({ column: "todo", refs: ["order/Shipped"], drift: drift.id, technical: false });
    expect(getDrift(p, drift.id).data).toMatchObject({ status: "resolved", resolution: "fix-code" });
    expect(() => resolveDrift(p, drift.id, "dismiss")).toThrow(/already resolved/);
  });

  test("accepting the attached Proposal approves it", () => {
    const prop = newProposal(p, "Model forgot this");
    editOrder(prop.id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    const drift = newDrift(p, { title: "Code has Lost", refs: ["order"], proposal: prop.id });
    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, prop.id).data.status).toBe("approved");
    expect(loadModel(p).machines.get("order")?.states.some((s) => s.name === "Lost")).toBe(true);
  });

  test("accepting without an attached Proposal fails and leaves the Drift open", () => {
    const drift = newDrift(p, { title: "Plain", refs: ["order"] });
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/no attached Proposal/);
    expect(getDrift(p, drift.id).data.status).toBe("open");
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
    editOrder(newProposal(p, "Lost").id, (t) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)"));
    newDrift(p, { title: "d", refs: ["order"] });
    expect(() => run(["--root", dir, "proposal", "approve", "1"], dir, agent)).toThrow(/developer's decision/);
    expect(() => run(["--root", dir, "proposal", "reject", "1", "--feedback", "no"], dir, agent)).toThrow(/developer's decision/);
    expect(() => run(["--root", dir, "drift", "resolve", "1", "--dismiss"], dir, agent)).toThrow(/developer's decision/);
    expect(getProposal(p, "1").data.status).toBe("open");
    expect(getDrift(p, "1").data.status).toBe("open");
    expect(run(["--root", dir, "proposal", "list"], dir, agent).exit).toBe(0);
    expect(run(["--root", dir, "proposal", "approve", "1"], dir, {}).exit).toBe(0);
  });

  test("drift resolve demands exactly one resolution", () => {
    newDrift(p, { title: "d", refs: ["order"] });
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
