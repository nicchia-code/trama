import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { boardView } from "../src/cli/work";
import { getProposal, listProposals, newProposal } from "../src/core/proposals";
import { createdNow, newCardId, type Project, projectAt } from "../src/core/store";
import { cardName } from "../src/core/short-numbers";
import { getDrift, getTask, listTasks, newDrift, newTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-id-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("a new card", () => {
  test("is born with its own eight-character identity, a slug name and the creation instant", () => {
    const proposal = newProposal(p, "Lost parcels");
    const task = newTask(p, { title: "Tell the customer", refs: ["order"], technical: false, proposal: proposal.id });
    const drift = newDrift(p, { where: "src/refund.ts",
      options: FIX_OPTIONS,
      title: "The code keeps the parcel",
      refs: ["order"],
      proposal: proposal.id,
      origin: task.id,
      happens: "The code keeps it.",
      should: "The Model says it is lost.",
    });

    for (const card of [proposal, task, drift]) {
      expect(card.id).toMatch(/^[a-z0-9]{8}$/);
      expect(card.data.created).toMatch(ISO);
    }
    expect(proposal.name).toBe(`${proposal.id}-lost-parcels`);
    expect(task.name).toBe(`${task.id}-tell-the-customer.md`);
    expect(drift.name).toBe(`${drift.id}-the-code-keeps-the-parcel.md`);
    expect(readFileSync(join(proposal.dir, "proposal.md"), "utf8")).toContain(`created: ${proposal.data.created}`);
    expect(task.data.proposal).toBe(proposal.id);
    expect(drift.data.proposal).toBe(proposal.id);
    expect(drift.data.origin).toBe(task.id);
    expect(getProposal(p, proposal.id).id).toBe(proposal.id);
    expect(getTask(p, task.id).data.drift).toBeNull();
  });

  test("a Task and a Proposal may share the same identity", () => {
    const proposal = newProposal(p, "Shared");
    const id = newCardId(join(p.dir, "tasks"), "file", "Task", () => proposal.id);
    expect(id).toBe(proposal.id);
  });

  test("draws again when that identity is already used by the same kind", () => {
    const tasks = join(p.dir, "tasks");
    mkdirSync(tasks, { recursive: true });
    writeFileSync(join(tasks, "abcd1234-taken.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# Taken\n");
    let draws = 0;
    const id = newCardId(tasks, "file", "Task", () => {
      draws += 1;
      return draws === 1 ? "abcd1234" : "zzzz9999";
    });
    expect(id).toBe("zzzz9999");
    expect(draws).toBe(2);
  });

  test("keeps creation order when two cards are born in the same millisecond", () => {
    const first = createdNow();
    const second = createdNow();
    expect(second > first).toBe(true);
  });
});

describe("a numbered card", () => {
  test("stays readable as the number, with or without padding, and has no creation instant", () => {
    const tasks = join(p.dir, "tasks");
    mkdirSync(tasks, { recursive: true });
    writeFileSync(join(tasks, "0012-old.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\n---\n# Old\n");
    for (const query of ["12", "0012", "0012-old", "0012-old.md"]) expect(getTask(p, query).id).toBe("0012");
    expect(getTask(p, "0012").data.created).toBeNull();
  });

  test("comes before a card that remembers an instant, and numbered cards stay in number order", () => {
    const tasks = join(p.dir, "tasks");
    mkdirSync(tasks, { recursive: true });
    writeFileSync(join(tasks, "0009-later.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\n---\n# Later\n");
    writeFileSync(join(tasks, "0002-earlier.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\n---\n# Earlier\n");
    const fresh = newTask(p, { title: "Fresh", refs: ["order"], technical: false });
    expect(listTasks(p).map((t) => t.id)).toEqual(["0002", "0009", fresh.id]);
  });
});

describe("citing a card", () => {
  test("a stored reference finds an all-digit random identity, and a command argument of only digits does not", () => {
    const drifts = join(p.dir, "drifts");
    mkdirSync(drifts, { recursive: true });
    const body = "---\nstatus: open\nrefs: [order]\ncreated: 2020-01-01T00:00:00.000Z\n---\n# All digits\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n\n## Fix options\n\n### A\n\nOne.\n\n### B\n\nTwo.\n";
    writeFileSync(join(drifts, "12345678-all-digits.md"), body);
    expect(getDrift(p, "12345678").id).toBe("12345678");
    expect(() => getDrift(p, "12345678", true)).toThrow(/No Drift with ID "12345678"/);
    expect(getDrift(p, "12345678-all-digits").id).toBe("12345678");
    expect(getDrift(p, "12345678-all-digits.md").id).toBe("12345678");
  });

  test("a unique prefix cites the card, and a prefix that matches several lists their identities", () => {
    const drifts = join(p.dir, "drifts");
    mkdirSync(drifts, { recursive: true });
    const file = (id: string) =>
      writeFileSync(
        join(drifts, `${id}-d.md`),
        "---\nstatus: open\nrefs: [order]\ncreated: 2020-01-01T00:00:00.000Z\n---\n# D\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n\n## Fix options\n\n### A\n\nOne.\n\n### B\n\nTwo.\n",
      );
    file("abcd1111");
    expect(getDrift(p, "abcd111", true).id).toBe("abcd1111");
    file("abcd2222");
    expect(() => getDrift(p, "abcd", true)).toThrow('Several Drifts match "abcd": abcd1111, abcd2222');
  });

  test("an eight-character identity with leading zeros is not the numbered card of that number", () => {
    const proposals = join(p.dir, "proposals");
    mkdirSync(join(proposals, "0007-numbered", "model"), { recursive: true });
    writeFileSync(join(proposals, "0007-numbered", "proposal.md"), "---\nstatus: open\nbase: {}\ndelete: []\n---\n# Numbered\n");
    mkdirSync(join(proposals, "00000007-random"), { recursive: true });
    writeFileSync(
      join(proposals, "00000007-random", "proposal.md"),
      "---\nstatus: draft\nbase: {}\ndelete: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# Random\n",
    );
    expect(getProposal(p, "7").id).toBe("0007");
    expect(getProposal(p, "0007").title).toBe("Numbered");
    expect(getProposal(p, "00000007").title).toBe("Random");
    expect(getProposal(p, "00000007", true).title).toBe("Numbered");
    const top = newProposal(p, "On top", "", { requires: ["00000007"] });
    expect(top.data.requires).toEqual(["00000007"]);
    expect(listProposals(p).map((x) => x.id)).toEqual(["0007", "00000007", top.id]);
  });
});

describe("a command cites a card", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

  test("by the whole identity, a unique prefix or the file name, and refuses an ambiguous prefix", () => {
    const tasks = join(p.dir, "tasks");
    const drifts = join(p.dir, "drifts");
    mkdirSync(tasks, { recursive: true });
    mkdirSync(drifts, { recursive: true });
    const taskFile = (id: string, title: string) =>
      writeFileSync(join(tasks, `${id}-${title}.md`), `---\ncolumn: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# ${title}\n`);
    taskFile("abcd1111", "alpha");
    taskFile("abcd2222", "beta");
    writeFileSync(join(tasks, "0012-numbered.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\n---\n# numbered\n");
    writeFileSync(join(tasks, "12345678-digits.md"), "---\ncolumn: todo\ntechnical: true\nrefs: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# digits\n");
    writeFileSync(
      join(drifts, "efgh3333-seen.md"),
      "---\nstatus: open\nrefs: [order]\ncreated: 2020-01-01T00:00:00.000Z\n---\n# seen\n\n## What happens\n\nCode.\n\n## What should happen\n\nModel.\n\n## Fix options\n\n### A\n\nOne.\n\n### B\n\nTwo.\n",
    );

    expect(cli("task", "show", "abcd1111").out).toContain("# alpha");
    expect(cli("task", "show", "abcd111").out).toContain("# alpha");
    expect(cli("task", "show", "abcd1111-alpha.md").out).toContain("# alpha");
    expect(() => cli("task", "show", "abcd")).toThrow('Several Tasks match "abcd": abcd1111, abcd2222');
    expect(cli("task", "show", "12").out).toContain("# numbered");
    expect(cli("task", "show", "0012").out).toContain("# numbered");
    expect(() => cli("task", "show", "12345678")).toThrow(/No Task with ID "12345678"/);
    expect(cli("task", "show", "12345678-digits.md").out).toContain("# digits");
    expect(cli("drift", "show", "efgh").out).toContain("# seen");
    expect(cli("drift", "show", "efgh3333-seen").out).toContain("# seen");

    const proposals = join(p.dir, "proposals");
    mkdirSync(join(proposals, "ijkl4444-lost"), { recursive: true });
    writeFileSync(join(proposals, "ijkl4444-lost", "proposal.md"), "---\nstatus: draft\nbase: {}\ndelete: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# lost\n");
    mkdirSync(join(proposals, "ijkl5555-found"), { recursive: true });
    writeFileSync(join(proposals, "ijkl5555-found", "proposal.md"), "---\nstatus: draft\nbase: {}\ndelete: []\ncreated: 2020-01-01T00:00:00.000Z\n---\n# found\n");
    expect(cli("proposal", "show", "ijkl4444").out).toContain("# lost");
    expect(cli("proposal", "show", "ijkl4444-lost").out).toContain("# lost");
    expect(cli("validate", "--proposal", "ijkl4").exit).toBe(0);
    expect(() => cli("proposal", "show", "ijkl")).toThrow('Several Proposals match "ijkl": ijkl4444, ijkl5555');
    expect(cli("task", "next", "--proposal", "ijkl444").out).toContain(`Proposal ${cardName(p, "proposal", "ijkl4444")}`);
  });
});

describe("creation order", () => {
  test("the board lists the Tasks in creation order, and the same instant is broken by identity", () => {
    const design = newProposal(p, "Returns");
    const tasks = join(p.dir, "tasks");
    mkdirSync(tasks, { recursive: true });
    const file = (id: string, title: string, created: string, proposal: string | null) =>
      writeFileSync(
        join(tasks, `${id}-${title}.md`),
        `---\ncolumn: todo\ntechnical: false\nrefs: [order]\nproposal: "${proposal ?? ""}"\ncreated: ${created}\n---\n# ${title}\n`.replace('proposal: ""\n', ""),
      );
    file("zzzzzzzz", "alone", "2020-01-03T00:00:00.000Z", null);
    file("aaaaaaaa", "second", "2020-01-02T00:00:00.000Z", design.id);
    file("mmmmmmmm", "first", "2020-01-01T00:00:00.000Z", design.id);
    file("bbbbbbbb", "bee", "2020-01-04T00:00:00.000Z", null);
    file("cccccccc", "cee", "2020-01-04T00:00:00.000Z", null);

    expect(listTasks(p).map((t) => t.id)).toEqual(["mmmmmmmm", "aaaaaaaa", "zzzzzzzz", "bbbbbbbb", "cccccccc"]);
    const board = boardView(p).md;
    expect(board.indexOf(`${cardName(p, "task", "bbbbbbbb")} bee`)).toBeLessThan(board.indexOf(`${cardName(p, "task", "cccccccc")} cee`));
  });
});
