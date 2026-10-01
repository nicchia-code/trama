import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, health, newProposal, rejectProposal } from "../src/core/proposals";
import { loadModel, type Project, projectAt } from "../src/core/store";
import { getDrift, getTask, newDrift, newTask, resolveDrift } from "../src/core/work";

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
    expect(() => newTask(p, { title: "x", refs: [], technical: false })).toThrow(/--technical/);
    expect(() => newTask(p, { title: "x", refs: ["order"], technical: true })).toThrow(/Technical/);
    expect(() => newTask(p, { title: "x", refs: ["order/Nope"], technical: false })).toThrow(/no State "Nope"/);
    const ok = newTask(p, { title: "Cancel flow", refs: ["order/Paid/user.CANCEL", "user.CANCEL"], technical: false });
    expect(getTask(p, ok.id).data.refs).toHaveLength(2);
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
