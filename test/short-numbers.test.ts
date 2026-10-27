import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { newProposal, rejectProposal, submitProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { shortNumbersDir, syncShortNumbers } from "../src/core/short-numbers";
import { type Project, projectAt } from "../src/core/store";
import { moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-numbers-"));
  copyShop(dir);
  p = projectAt(dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(`${dir}.trama-worktrees`, { recursive: true, force: true });
});

const assigned = () => join(shortNumbersDir(p), "assigned");
const task = (title: string) => newTask(p, { title, refs: ["order"], technical: false });
const drift = (title: string) =>
  newDrift(p, { where: "src/refund.ts", title, refs: ["order"], options: FIX_OPTIONS, happens: "The code does it.", should: "The Model says otherwise." });
const numberOf = (kind: "proposal" | "task" | "drift", id: string) => syncShortNumbers(p).of(kind, id);

describe("assignment", () => {
  test("a live card takes the lowest free number of its kind, and kinds count separately", () => {
    const a = task("A");
    const b = task("B");
    const draft = newProposal(p, "Draft");
    const open = drift("D");

    const numbers = syncShortNumbers(p);
    expect([numbers.label("task", a.id), numbers.label("task", b.id)]).toEqual(["T1", "T2"]);
    expect(numbers.label("proposal", draft.id)).toBe("P1");
    expect(numbers.label("drift", open.id)).toBe("D1");
    expect(numbers.find("task", 2)).toBe(b.id);
    expect(numbers.find("task", 3)).toBeNull();
  });

  test("several cards seen in one reading take their numbers in creation order, however they are named", () => {
    const first = task("First");
    const second = task("Second");
    const third = task("Third");
    // Written back to front on disk: names do not decide the order, creation does.
    for (const t of [third, first, second]) writeFileSync(t.path, readFileSync(t.path, "utf8"));

    const numbers = syncShortNumbers(p);
    expect([first, second, third].map((t) => numbers.of("task", t.id))).toEqual([1, 2, 3]);
  });

  test("a card still named NNNN-<slug> takes a number in number order, before cards that remember an instant", () => {
    const tasks = join(p.dir, "tasks");
    mkdirSync(tasks, { recursive: true });
    const old = (n: string) => `---\ncolumn: todo\nrefs:\n  - order\n---\n# Old ${n}\n`;
    writeFileSync(join(tasks, "0007-seven.md"), old("7"));
    writeFileSync(join(tasks, "0002-two.md"), old("2"));
    const fresh = task("Fresh");

    const numbers = syncShortNumbers(p);
    expect([numbers.of("task", "0002"), numbers.of("task", "0007"), numbers.of("task", fresh.id)]).toEqual([1, 2, 3]);
  });

  test("a card keeps its number while others come and go", () => {
    const a = task("A");
    const b = task("B");
    syncShortNumbers(p);
    moveTask(p, a.id, "done", "developer");
    const c = task("C");

    const numbers = syncShortNumbers(p);
    expect(numbers.of("task", b.id)).toBe(2);
    expect(numbers.of("task", c.id)).toBe(1);
  });

  test("a first reading with no live card writes nothing", () => {
    syncShortNumbers(p);
    expect(existsSync(shortNumbersDir(p))).toBe(false);
  });
});

describe("release", () => {
  test("a Task in Done, a rejected Proposal and a resolved Drift lose their numbers; a Task that comes back takes the lowest free one", () => {
    const a = task("A");
    const b = task("B");
    const c = task("C");
    const proposal = newProposal(p, "Change");
    const open = drift("D");
    syncShortNumbers(p);

    moveTask(p, a.id, "done", "developer");
    moveTask(p, b.id, "doing", "developer");
    submitProposal(p, proposal.id);
    rejectProposal(p, proposal.id);
    resolveDrift(p, open.id, "dismiss");

    const closed = syncShortNumbers(p);
    expect(closed.of("task", a.id)).toBeNull();
    expect(closed.of("task", b.id)).toBe(2);
    expect(closed.of("task", c.id)).toBe(3);
    expect(closed.of("proposal", proposal.id)).toBeNull();
    expect(closed.of("drift", open.id)).toBeNull();
    expect(readFileSync(assigned(), "utf8")).not.toContain(a.id);

    const next = task("D");
    moveTask(p, a.id, "todo", "developer");
    const back = syncShortNumbers(p);
    // The returning Task is read in the same reading as the new one and is older, so it takes the free 1 first.
    expect([back.of("task", a.id), back.of("task", next.id)]).toEqual([1, 4]);
  });

  test("a released number goes to the next card of that kind", () => {
    const a = task("A");
    task("B");
    syncShortNumbers(p);
    moveTask(p, a.id, "done", "developer");
    syncShortNumbers(p);

    const c = task("C");
    expect(numberOf("task", c.id)).toBe(1);
  });

  test("a Done Task of a design keeps its number while the design is open, and loses it with the others once all are Done", () => {
    const design = newProposal(p, "Design").id;
    const linked = (title: string) => newTask(p, { title, refs: ["order"], technical: false, proposal: design });
    const a = linked("A");
    const b = linked("B");
    const loose = task("Loose");
    syncShortNumbers(p);

    moveTask(p, a.id, "done", "developer");
    const halfway = syncShortNumbers(p);
    expect([halfway.of("task", a.id), halfway.of("task", b.id), halfway.of("task", loose.id)]).toEqual([1, 2, 3]);
    expect(run(["--root", dir, "task", "show", b.id], dir, {}).out).toContain("# B");

    moveTask(p, b.id, "done", "developer");
    const closed = syncShortNumbers(p);
    expect([closed.of("task", a.id), closed.of("task", b.id), closed.of("task", loose.id)]).toEqual([null, null, 3]);

    // A Done Task without a number never takes one: a reopened design gives the number only to the Task that moves back.
    moveTask(p, a.id, "todo", "developer");
    const reopened = syncShortNumbers(p);
    expect([reopened.of("task", a.id), reopened.of("task", b.id)]).toEqual([1, null]);
  });

  test("a line for a card that no longer exists is removed", () => {
    const a = task("A");
    syncShortNumbers(p);
    writeFileSync(assigned(), `${readFileSync(assigned(), "utf8")}task gone0000 9\n`);

    syncShortNumbers(p);
    expect(readFileSync(assigned(), "utf8")).toBe(`task ${a.id} 1\n`);
  });
});

describe("the file", () => {
  test("has one line per live card, written with a .gitignore of its own that ignores everything", () => {
    const a = task("A");
    const proposal = newProposal(p, "P");
    syncShortNumbers(p);

    expect(readFileSync(assigned(), "utf8")).toBe(`proposal ${proposal.id} 1\ntask ${a.id} 1\n`);
    expect(readFileSync(join(shortNumbersDir(p), ".gitignore"), "utf8")).toBe("*\n");
    expect(readdirSync(shortNumbersDir(p)).sort()).toEqual([".gitignore", "assigned"]);
  });

  test("no number is written into any card file", () => {
    const a = task("A");
    const open = drift("D");
    const proposal = newProposal(p, "P");
    syncShortNumbers(p);

    for (const file of [a.path, open.path, join(proposal.dir, "proposal.md")]) expect(readFileSync(file, "utf8")).not.toMatch(/\b[PTD]1\b/);
  });

  test("a missing file is rebuilt from zero in creation order", () => {
    const a = task("A");
    const b = task("B");
    syncShortNumbers(p);
    moveTask(p, a.id, "done", "developer");
    const c = task("C");
    syncShortNumbers(p);
    expect([numberOf("task", b.id), numberOf("task", c.id)]).toEqual([2, 1]);

    rmSync(assigned());
    const rebuilt = syncShortNumbers(p);
    expect([rebuilt.of("task", b.id), rebuilt.of("task", c.id)]).toEqual([1, 2]);
    expect(existsSync(assigned())).toBe(true);
  });

  test.each([
    ["a line that makes no sense", (id: string, other: string) => `task ${id} 2\nthis is not a line\ntask ${other} 3\n`],
    ["a number given twice within a kind", (id: string, other: string) => `task ${id} 2\ntask ${other} 2\n`],
    ["a number with a leading zero", (id: string, other: string) => `task ${id} 02\ntask ${other} 3\n`],
    ["a card listed twice", (id: string, other: string) => `task ${id} 2\ntask ${id} 3\ntask ${other} 4\n`],
    ["a kind that does not exist", (id: string, other: string) => `task ${id} 2\nbug ${other} 3\n`],
  ])("%s rebuilds every number from zero and fails nothing", (_name, content) => {
    const a = task("A");
    const b = task("B");
    const open = drift("D");
    mkdirSync(shortNumbersDir(p), { recursive: true });
    writeFileSync(assigned(), content(a.id, b.id));

    const numbers = syncShortNumbers(p);
    expect([numbers.of("task", a.id), numbers.of("task", b.id), numbers.of("drift", open.id)]).toEqual([1, 2, 1]);
    expect(readFileSync(assigned(), "utf8")).toBe(`task ${a.id} 1\ntask ${b.id} 2\ndrift ${open.id} 1\n`);
  });

  test("a file that cannot be read nor saved still numbers the cards, and no command fails", () => {
    const a = task("A");
    const b = task("B");
    mkdirSync(assigned(), { recursive: true });

    const numbers = syncShortNumbers(p);
    expect([numbers.of("task", a.id), numbers.of("task", b.id)]).toEqual([1, 2]);
    expect(run(["--root", dir, "task", "show", "T2"], dir, {}).out).toContain("# B");
    expect(readdirSync(shortNumbersDir(p)).sort()).toEqual([".gitignore", "assigned"]);
  });

  test("the same number may repeat across kinds", () => {
    const a = task("A");
    const open = drift("D");
    const numbers = syncShortNumbers(p);
    expect([numbers.label("task", a.id), numbers.label("drift", open.id)]).toEqual(["T1", "D1"]);
  });
});

describe("when the numbers are given", () => {
  test("any command that reads the project numbers its new cards, and the next one finds them unchanged", () => {
    const a = task("A");
    expect(existsSync(assigned())).toBe(false);

    run(["--root", dir, "task", "list"], dir);
    expect(readFileSync(assigned(), "utf8")).toBe(`task ${a.id} 1\n`);

    const b = task("B");
    run(["--root", dir, "project", "show"], dir);
    expect(readFileSync(assigned(), "utf8")).toBe(`task ${a.id} 1\ntask ${b.id} 2\n`);
  });

  test("a refresh of the panel numbers the cards it has not seen", () => {
    const a = task("A");
    const proposal = newProposal(p, "P");
    expect(existsSync(assigned())).toBe(false);

    const snapshot = buildSnapshot(p);
    expect(readFileSync(assigned(), "utf8")).toBe(`proposal ${proposal.id} 1\ntask ${a.id} 1\n`);
    expect(snapshot.numbers).toEqual({ proposal: { [proposal.id]: "P1" }, task: { [a.id]: "T1" }, drift: {} });
  });
});

describe("as a command argument", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

  test("T3 and t3 name the live Task, and what is written holds its identity", () => {
    const a = task("A");
    const b = task("B");

    expect(cli("task", "show", "T2").out).toContain(b.title);
    expect(cli("task", "show", "t2").out).toContain(b.title);

    cli("task", "move", "T1", "doing");
    expect(readFileSync(a.path, "utf8")).toContain("column: doing");

    const filed = cli("drift", "new", "--input", JSON.stringify({ title: "Found", where: "src/refund.ts", refs: ["order"], happens: "h", should: "s", task: "T2", options: [{ title: "x", text: "y" }, { title: "z", text: "w" }] }));
    expect(filed.exit).toBe(0);
    const text = readdirSync(join(p.dir, "drifts")).map((f) => readFileSync(join(p.dir, "drifts", f), "utf8")).join("");
    expect(text).toContain(`origin: ${b.id}`);
    expect(text).not.toMatch(/origin: T\d+\n/i);
  });

  test("the developer's commands take a number too", () => {
    const proposal = newProposal(p, "Change");
    submitProposal(p, proposal.id);
    const open = drift("D");

    cli("proposal", "move", "P1", "rejected", "--input", JSON.stringify({ feedback: "no" }));
    expect(readFileSync(join(proposal.dir, "proposal.md"), "utf8")).toContain("status: rejected");
    cli("drift", "move", "D1", "dismissed");
    expect(readFileSync(open.path, "utf8")).toContain("status: resolved");
  });

  test("a letter that is not the kind the command expects is refused, saying whose number it is, and nothing changes", () => {
    const a = task("A");
    newProposal(p, "P");
    const before = readFileSync(a.path, "utf8");

    expect(() => cli("proposal", "show", "T1")).toThrow(/short number T1 of a Task, not of a Proposal/);
    expect(() => cli("drift", "show", "P1")).toThrow(/short number P1 of a Proposal, not of a Drift/);
    expect(() => cli("task", "move", "D1", "done")).toThrow(/of a Drift, not of a Task/);
    expect(readFileSync(a.path, "utf8")).toBe(before);
  });

  test("a number nobody has, or that a closed card gave up, is refused and changes nothing", () => {
    const a = task("A");
    syncShortNumbers(p);
    moveTask(p, a.id, "done", "developer");

    expect(() => cli("task", "show", "T99")).toThrow(/No live Task has the short number T99/);
    expect(() => cli("task", "move", "T1", "todo")).toThrow(/No live Task has the short number T1/);
    expect(readFileSync(a.path, "utf8")).toContain("column: done");
    expect(cli("task", "show", a.id).out).toContain(a.title);
  });

  test("a letter followed by digits is a short number, never the start of an identity", () => {
    const a = task("A");
    writeFileSync(join(p.dir, "tasks", "t1abcdef-lookalike.md"), "---\ncolumn: todo\nrefs:\n  - order\ncreated: 2099-01-01T00:00:00.000Z\n---\n# Lookalike\n");

    expect(cli("task", "show", "t1").out).toContain(`# ${a.title}`);
    expect(cli("task", "show", "t1").out).not.toContain("Lookalike");
    expect(cli("task", "show", "t1a").out).toContain("Lookalike");
    expect(numberOf("task", a.id)).not.toBeNull();
  });

  test("a short number that is only digits after the letter with a leading zero names nothing", () => {
    task("A");
    expect(() => cli("task", "show", "T01")).toThrow(/No live Task has the short number T01/);
  });
});

describe("cards in a worktree left from a round", () => {
  test("this working copy numbers only its own cards", () => {
    const git = (...args: string[]) => {
      const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8", timeout: 30_000, killSignal: "SIGKILL" });
      if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    };
    const mine = task("Mine");
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "x");
    const home = join(`${dir}.trama-worktrees`, "abcd1234");
    git("worktree", "add", "-q", "-b", "trama/abcd1234", home);
    const theirs = newTask(projectAt(home), { title: "Theirs", refs: ["order"], technical: false });
    const found = newDrift(projectAt(home), { where: "src/refund.ts", title: "Found", refs: ["order"], options: FIX_OPTIONS, happens: "h", should: "s" });

    const numbers = syncShortNumbers(p);
    expect([numbers.of("task", mine.id), numbers.of("task", theirs.id), numbers.of("drift", found.id)]).toEqual([1, null, null]);
  });
});

describe("as the command line shows cards", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {}).out;

  test("a live card is written by its number alone, a closed one by its identity alone, never both", () => {
    const a = task("A");
    const b = task("B");
    cli("task", "move", "T1", "done");

    const list = cli("task", "list");
    expect(list).toContain(`- ${a.id} A`);
    expect(list).toContain("- T2 B");
    expect(list).not.toContain(`T1 A`);
    expect(list).not.toContain(b.id);
    expect(cli("task", "move", "T2", "doing")).toBe("Task T2 is now doing");
    expect(cli("task", "move", "T2", "done")).toBe(`Task ${b.id} is now done`);
  });

  test("--json carries the identity as id and the number as number, none for a closed card, in every command that describes a card", () => {
    const a = task("A");
    const proposal = newProposal(p, "P");
    const open = drift("D");
    cli("task", "move", a.id, "done");

    const tasks = JSON.parse(cli("--json", "task", "list")).tasks;
    expect(tasks).toMatchObject([{ id: a.id, number: null }]);
    expect(JSON.parse(cli("--json", "proposal", "list")).proposals).toMatchObject([{ id: proposal.id, number: "P1" }]);
    expect(JSON.parse(cli("--json", "drift", "show", "D1")).number).toBe("D1");
    expect(JSON.parse(cli("--json", "proposal", "show", "P1")).id).toBe(proposal.id);
    expect(JSON.parse(cli("--json", "task", "new", "--input", '{"title":"Next","refs":["order"]}')).number).toBe("T1");
    const board = JSON.parse(cli("--json", "project", "show"));
    expect(board.inWriting).toMatchObject([{ id: proposal.id, number: "P1" }]);
    expect(board.toDecide.drifts).toMatchObject([{ id: open.id, number: "D1" }]);
  });

  test("a block names its blockers by number, and the card they concern too", () => {
    const a = task("A");
    const open = newDrift(p, { where: "src/refund.ts", title: "Found", refs: ["order"], options: FIX_OPTIONS, origin: a.id, happens: "h", should: "s" });
    const shown = cli("task", "show", "T1");
    expect(shown).toContain("(blocked by Drift D1)");
    expect(shown).toContain("Blocked by Drift D1: Found");
    expect(shown).not.toContain(open.id);
    expect(() => run(["--root", dir, "task", "move", "T1", "doing"], dir, { TRAMA_AGENT: "1", TRAMA_TERMINAL: "aaa111" })).toThrow(/Task T1 is blocked.*Drift D1 "Found"/);
  });
});
