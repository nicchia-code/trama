import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { listAnnouncements } from "../src/core/announcements";
import { buildSnapshot } from "../src/core/snapshot";
import { readDocument, type Project, projectAt, writeDocument } from "../src/core/store";
import { blockedTasks, driftCandidates, getDrift, getTask, listDrifts, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-blocking-"));
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

describe("a Drift leaves no Task free", () => {
  test("an open Drift blocks every Task it concerns, the ones created later too", () => {
    const paid = task(["order/Paid"]);
    const cancel = task(["order/Paid/user.CANCEL"]);
    drift(["order/Paid"]);
    expect(blockedIds()).toEqual([paid, cancel].sort());
    const later = task(["order/Paid"]);
    expect(blockedIds()).toEqual([paid, cancel, later].sort());
  });

  test("an old `notBlocking` in a Drift file is read without error and frees nothing", () => {
    const paid = task(["order/Paid"]);
    const cancel = task(["order/Paid/user.CANCEL"]);
    const d = drift(["order/Paid"]);
    const doc = readDocument(d.path);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ task: paid, reason: "Only the wording of the screen differs." }] }, doc.body);
    expect(getDrift(p, d.id).data).not.toHaveProperty("notBlocking");
    expect(blockedIds()).toEqual([paid, cancel].sort());
    expect(buildSnapshot(p).drifts.find((x) => x.id === d.id)).not.toHaveProperty("notBlocking");
  });

  test("an old `notBlocking` that is malformed is ignored too", () => {
    const paid = task(["order/Paid"]);
    const d = drift(["order/Paid"]);
    const doc = readDocument(d.path);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ reason: "No Task named." }, "text"] }, doc.body);
    expect(() => listDrifts(p)).not.toThrow();
    writeDocument(d.path, { ...doc.data, notBlocking: "not a list" }, doc.body);
    expect(() => listDrifts(p)).not.toThrow();
    expect(blockedIds()).toEqual([paid]);
  });

  test("the origin an old `notBlocking` named goes back to To do when the code is fixed, and saving drops the field", () => {
    const origin = task(["cart"]);
    moveTask(p, origin, "doing", "developer");
    const d = drift(["cart"], { origin });
    const doc = readDocument(d.path);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ task: origin, reason: "The cart is not involved." }] }, doc.body);
    expect(blockedTasks(p).has(origin)).toBe(true);
    resolveDrift(p, d.id, "fix-code", [], { option: 1 });
    expect(getTask(p, origin).data.column).toBe("todo");
    const fix = getDrift(p, d.id).data.task as string;
    expect(blockedTasks(p).get(origin)).toMatchObject([{ kind: "fix", task: fix }]);
    expect(readFileSync(d.path, "utf8")).not.toContain("notBlocking");
  });

  test("a new Drift never writes `notBlocking`", () => {
    const plain = drift(["order/Paid"]);
    expect(readFileSync(plain.path, "utf8")).not.toContain("notBlocking");
  });
});

describe("drift candidates", () => {
  test("lists the Tasks a new Drift with those references and origin would block, and writes nothing", () => {
    const paid = task(["order/Paid"]);
    const origin = task(["cart"]);
    const before = listDrifts(p).length;
    expect(driftCandidates(p, ["order/Paid"], [origin]).map((t) => t.id).sort()).toEqual([paid, origin].sort());
    expect(driftCandidates(p, ["order/Paid"], []).map((t) => t.id)).toEqual([paid]);
    expect(driftCandidates(p, ["order/Shipped"], [])).toEqual([]);
    expect(listDrifts(p).length).toBe(before);
  });

  test("ignores the other Drifts, so a Task that another Drift blocks is still a candidate", () => {
    const paid = task(["order/Paid"]);
    drift(["order/Paid"]);
    expect(driftCandidates(p, ["order/Paid"], []).map((t) => t.id)).toEqual([paid]);
  });

  test("a reference that does not resolve is refused; an origin Task that no longer exists blocks nothing", () => {
    expect(() => driftCandidates(p, ["order/Nope"], [])).toThrow();
    expect(driftCandidates(p, ["order/Paid"], ["zzzzzzzz"])).toEqual([]);
  });
});

describe("the command line", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});
  const idOf = (out: string): string => {
    const parsed: { id: string } = JSON.parse(out);
    return parsed.id;
  };
  const filing = { title: "A difference", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another.", options: [{ title: "Change the code", text: "Make the code match." }, { title: "Drop it", text: "Remove the behaviour." }], where: "src/refund.ts" };
  const driftNew = (input: object, ...rest: string[]) => cli("drift", "new", "--input", JSON.stringify(input), ...rest);

  test("drift new with dryRun prints the Tasks it would block", () => {
    const other = idOf(cli("task", "new", "--input", '{"title":"Ship","refs":["order/Shipped"]}', "--json").out);
    cli("task", "new", "--input", '{"title":"Pay","refs":["order/Paid"]}', "--json");
    const listed = cli("drift", "new", "--input", '{"dryRun":true,"refs":["order/Paid"]}');
    expect(listed.exit).toBe(0);
    expect(listed.out).toMatch(/^- T\d+ Pay$/m);
    expect(listed.out).not.toContain("Ship");
    expect(cli("drift", "new", "--input", '{"dryRun":true,"refs":["order/Shipped"]}', "--json").out).toContain(other);
    expect(() => cli("drift", "new", "--input", '{"dryRun":true,"refs":["order/Nothing-here"]}')).toThrow();
    expect(() => cli("drift", "new", "--input", '{"dryRun":true,"refs":["order/Paid"],"task":"zzzzzzzz"}')).toThrow();
  });

  test("drift new no longer accepts `notBlocking`, and writes nothing", () => {
    const paid = idOf(cli("task", "new", "--input", '{"title":"Pay","refs":["order/Paid"]}', "--json").out);
    expect(() => driftNew({ ...filing, notBlocking: [{ task: paid, reason: "Only the wording differs." }] })).toThrow();
    expect(listDrifts(p)).toEqual([]);
  });

  test("drift show and list carry no freed Tasks, also for a Drift file with an old `notBlocking`", () => {
    const paid = idOf(cli("task", "new", "--input", '{"title":"Pay","refs":["order/Paid"]}', "--json").out);
    const d = newDrift(p, { ...filing, options: FIX_OPTIONS });
    const doc = readDocument(d.path);
    writeDocument(d.path, { ...doc.data, notBlocking: [{ task: paid, reason: "Only the wording differs." }] }, doc.body);
    const shown = cli("drift", "show", d.id).out;
    expect(shown).not.toContain("Not blocking");
    const listedJson: { drifts: Record<string, unknown>[] } = JSON.parse(cli("drift", "list", "--json").out);
    expect(listedJson.drifts.find((x) => x["id"] === d.id)).not.toHaveProperty("notBlocking");
    expect(JSON.parse(cli("drift", "show", d.id, "--json").out)).not.toHaveProperty("notBlocking");
  });

  test("a dry run writes nothing, announces nothing and lists the Tasks that would be blocked", () => {
    const paid = idOf(cli("task", "new", "--input", '{"title":"Pay","refs":["order/Paid"]}', "--json").out);
    const before = listDrifts(p).length;
    const out = cli("drift", "new", "--input", '{"dryRun":true,"refs":["order/Paid"]}', "--json").out;
    const parsed: { tasks: { id: string; title: string }[] } = JSON.parse(out);
    expect(parsed.tasks.map((t) => t.id)).toEqual([paid]);
    expect(listDrifts(p)).toHaveLength(before);
    expect(listAnnouncements(p)).toEqual([]);
  });

  test("a number of options out of bounds is refused and writes nothing", () => {
    const one = [{ title: "Only", text: "One option." }];
    const six = Array.from({ length: 6 }, (_, i) => ({ title: `Option ${i}`, text: "Text." }));
    for (const options of [one, six, []]) expect(() => driftNew({ ...filing, options })).toThrow();
    expect(listDrifts(p)).toEqual([]);
  });

  test("drift new without happens is a usage error naming it", () => {
    const { happens: _, ...without } = filing;
    expect(() => driftNew(without)).toThrow(/happens/);
    expect(listDrifts(p)).toEqual([]);
  });

  test("drift move proposal-accepted with an option is refused", () => {
    const d = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "A difference", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => cli("drift", "move", d.id, "proposal-accepted", "--input", '{"option":1}')).toThrow();
    expect(getDrift(p, d.id).data.status).toBe("open");
  });
});
