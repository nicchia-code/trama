import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { rewrittenId } from "../src/core/rewrite-ids";
import { buildSnapshot } from "../src/core/snapshot";
import { readDocument, type Project, projectAt, writeDocument } from "../src/core/store";
import { blockedTasks, driftCandidates, freedTasks, getDrift, getTask, listDrifts, listTasks, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-free-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** A Task naming only Requirements is technical. */
const task = (refs: string[]) => newTask(p, { title: refs.join(" "), refs, technical: refs.every((r) => r.startsWith("requirements/")) }).id;
const drift = (refs: string[], extra: Partial<Parameters<typeof newDrift>[1]> = {}) =>
  newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "A difference", refs, happens: "The code does it one way.", should: "The Model says another.", ...extra });
/** The IDs of the Tasks blocked by some open Drift, sorted. */
const blockedIds = () => [...blockedTasks(p).keys()].sort();

describe("a Drift leaves free the Tasks it names", () => {
  test("the named Task is not blocked, the others it concerns are, and so are those created later", () => {
    const paid = task(["order/Paid"]);
    const cancel = task(["order/Paid/user.CANCEL"]);
    const d = drift(["order/Paid"], { notBlocking: [{ task: paid, reason: "Only the wording of the screen differs." }] });
    expect(blockedIds()).toEqual([cancel]);
    const later = task(["order/Paid"]);
    expect(blockedIds()).toEqual([cancel, later].sort());
    expect(getDrift(p, d.id).data.notBlocking).toEqual([{ task: paid, reason: "Only the wording of the screen differs." }]);
  });

  test("the origin the Drift leaves free is not blocked, and fixing the code leaves it in its column", () => {
    const origin = task(["cart"]);
    moveTask(p, origin, "doing", "developer");
    const d = drift(["cart"], { origin, notBlocking: [{ task: origin, reason: "The cart is not involved." }] });
    expect(blockedTasks(p).has(origin)).toBe(false);
    resolveDrift(p, d.id, "fix-code", [], { option: 1 });
    expect(getTask(p, origin).data.column).toBe("doing");
    expect(blockedTasks(p).has(origin)).toBe(false);
  });

  test("without a named origin, fixing the code still moves the origin to To do and makes it wait for the fix", () => {
    const origin = task(["cart"]);
    moveTask(p, origin, "doing", "developer");
    const d = drift(["cart"], { origin });
    expect(blockedTasks(p).has(origin)).toBe(true);
    resolveDrift(p, d.id, "fix-code", [], { option: 1 });
    expect(getTask(p, origin).data.column).toBe("todo");
    expect(blockedTasks(p).get(origin)?.[0]?.kind).toBe("fix");
  });

  test("a Task that no longer exists stays in the list, counts for nothing and has no title", () => {
    const paid = task(["order/Paid"]);
    const cancel = task(["order/Paid/user.CANCEL"]);
    const d = drift(["order/Paid"], { notBlocking: [{ task: paid, reason: "Gone soon." }] });
    rmSync(getTask(p, paid).path);
    const [named] = freedTasks(getDrift(p, d.id), listTasks(p));
    expect(named).toEqual({ task: paid, reason: "Gone soon.", title: null });
    expect(blockedIds()).toEqual([cancel]);
  });

  test("the list is read back from the file, and a Drift without it blocks as always", () => {
    const paid = task(["order/Paid"]);
    const plain = drift(["order/Paid"]);
    expect(getDrift(p, plain.id).data.notBlocking).toEqual([]);
    expect(readFileSync(plain.path, "utf8")).not.toContain("notBlocking");
    expect(blockedIds()).toEqual([paid]);
  });

  test("a list item without its task or its reason is a read error", () => {
    task(["order/Paid"]);
    const d = drift(["order/Paid"]);
    const doc = readDocument(d.path);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ reason: "No Task named." }] }, doc.body);
    expect(() => listDrifts(p)).toThrow(/notBlocking/);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ task: "abcd1234" }] }, doc.body);
    expect(() => listDrifts(p)).toThrow(/reason/);
  });

  test("the Snapshot carries the freed Tasks with their titles and reasons", () => {
    const paid = task(["order/Paid"]);
    const d = drift(["order/Paid"], { notBlocking: [{ task: paid, reason: "Only the wording differs." }] });
    const view = buildSnapshot(p).drifts.find((x) => x.id === d.id);
    expect(view?.notBlocking).toEqual([{ task: paid, reason: "Only the wording differs.", title: getTask(p, paid).title }]);
  });
});

describe("the Tasks a Drift may leave free", () => {
  test("refuses, naming the Task, one it would not block, one that does not exist, one named twice, one with no reason", () => {
    const paid = task(["order/Paid"]);
    const shipped = task(["order/Shipped"]);
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: shipped, reason: "Not the same thing." }] })).toThrow(/would not block/);
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: "zzzzzzzz", reason: "No such Task." }] })).toThrow(/does not exist/);
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: paid, reason: "One." }, { task: paid, reason: "Two." }] })).toThrow(/named more than once/);
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: paid, reason: "   " }] })).toThrow(/needs its reason/);
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: "", reason: "A reason with no Task." }] })).toThrow(/no Task before it/);
    expect(listDrifts(p)).toEqual([]);
    expect(blockedIds()).toEqual([]);
  });

  test("the check uses the blocks themselves: the origin counts, and a Done Task is not one the Drift would block", () => {
    const origin = task(["cart"]);
    const done = task(["order/Paid"]);
    moveTask(p, done, "done", "developer");
    expect(() => drift(["order/Paid"], { notBlocking: [{ task: done, reason: "Already Done." }] })).toThrow(/would not block/);
    expect(() => drift(["order/Paid"], { origin, notBlocking: [{ task: origin, reason: "The origin itself." }] })).not.toThrow();
  });
});

describe("drift candidates", () => {
  test("lists the Tasks a new Drift with those references and origin would block, and writes nothing", () => {
    const paid = task(["order/Paid"]);
    const origin = task(["cart"]);
    const before = listDrifts(p).length;
    expect(driftCandidates(p, ["order/Paid"], origin).map((t) => t.id).sort()).toEqual([paid, origin].sort());
    expect(driftCandidates(p, ["order/Paid"], null).map((t) => t.id)).toEqual([paid]);
    expect(driftCandidates(p, ["order/Shipped"], null)).toEqual([]);
    expect(listDrifts(p).length).toBe(before);
  });

  test("ignores the other Drifts, so a Task that another Drift blocks is still a candidate", () => {
    const paid = task(["order/Paid"]);
    drift(["order/Paid"]);
    expect(driftCandidates(p, ["order/Paid"], null).map((t) => t.id)).toEqual([paid]);
  });

  test("a reference that does not resolve, or an origin that is not a Task, is refused", () => {
    expect(() => driftCandidates(p, ["order/Nope"], null)).toThrow();
    expect(() => driftCandidates(p, ["order/Paid"], "zzzzzzzz")).toThrow();
  });
});

describe("the command line", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});
  const idOf = (out: string): string => {
    const parsed: { id: string } = JSON.parse(out);
    return parsed.id;
  };
  const filing = ["--ref", "order/Paid", "--happens", "The code does it one way.", "--should", "The Model says another.", "--option", "Change the code", "--option-text", "Make the code match.", "--option", "Drop it", "--option-text", "Remove the behaviour.", "--where", "src/refund.ts"];

  test("drift candidates prints the Tasks, and drift show and list carry what is left free", () => {
    const paid = idOf(cli("task", "new", "Pay", "--ref", "order/Paid", "--json").out);
    const other = idOf(cli("task", "new", "Ship", "--ref", "order/Shipped", "--json").out);
    const listed = cli("drift", "candidates", "--ref", "order/Paid");
    expect(listed.exit).toBe(0);
    expect(listed.out).toMatch(/^- T\d+ Pay$/m);
    expect(listed.out).not.toContain("Ship");
    expect(cli("drift", "candidates", "--ref", "order/Shipped", "--json").out).toContain(other);
    expect(() => cli("drift", "candidates", "--ref", "order/Nothing-here")).toThrow();
    expect(() => cli("drift", "candidates", "--ref", "order/Paid", "--task", "zzzzzzzz")).toThrow();

    const filed = cli("drift", "new", "A difference", ...filing, "--not-blocking", paid, "--not-blocking-reason", "Only the wording differs.", "--json");
    expect(filed.exit).toBe(0);
    const drift = idOf(filed.out);
    const shown = cli("drift", "show", drift).out;
    expect(shown).toContain("## Not blocking");
    expect(shown).toMatch(/- (T\d+|[a-z0-9]{8}) Pay: Only the wording differs\./);
    expect(shown.indexOf("## Not blocking")).toBeGreaterThan(shown.indexOf("## Where in the code"));
    const listedJson: { drifts: { id: string; notBlocking: { task: string; number: string; title: string; reason: string }[] }[] } = JSON.parse(cli("drift", "list", "--all", "--json").out);
    expect(listedJson.drifts.find((d) => d.id === drift)?.notBlocking).toEqual([{ task: paid, number: expect.any(String), title: "Pay", reason: "Only the wording differs." }]);
  });

  test("drift new refuses a Task the Drift would not block, naming it, and writes nothing", () => {
    const shipped = idOf(cli("task", "new", "Ship", "--ref", "order/Shipped", "--json").out);
    expect(() => cli("drift", "new", "A difference", ...filing, "--not-blocking", shipped, "--not-blocking-reason", "Not the same.")).toThrow(/would not block/);
    expect(listDrifts(p)).toEqual([]);
  });

  test("ids rewrite carries the identities of the Tasks a Drift leaves free", () => {
    mkdirSync(join(p.dir, "tasks"), { recursive: true });
    mkdirSync(join(p.dir, "drifts"), { recursive: true });
    writeFileSync(join(p.dir, "tasks", "0003-label.md"), "---\ncolumn: todo\ntechnical: false\nrefs: [order]\n---\n# Label\n\nPrint it.\n");
    writeFileSync(join(p.dir, "drifts", "0004-late.md"), "---\nstatus: open\nrefs: [order]\norigin: null\nnotBlocking: [{ task: \"0003\", reason: \"Only the wording.\" }]\n---\n# Late\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n");
    expect(cli("ids", "rewrite").exit).toBe(0);
    const freed = getDrift(p, rewrittenId("drift", "0004")).data.notBlocking;
    expect(freed).toEqual([{ task: rewrittenId("task", "0003"), reason: "Only the wording." }]);
    expect(readFileSync(join(p.dir, "drifts", `${rewrittenId("drift", "0004")}-late.md`), "utf8")).toContain("notBlocking");
  });
});
