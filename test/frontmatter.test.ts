import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { TramaError } from "../src/core/errors";
import { getProposal, listProposals } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, getTask, listDrifts, listTasks } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-fm-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const write = (rel: string, text: string) => {
  const path = join(p.dir, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
  return path;
};

const task = (front: string) => write("tasks/0001-t.md", `---\n${front}\n---\n# T\n`);
const proposal = (front: string) => write("proposals/0001-p/proposal.md", `---\n${front}\n---\n# P\n`);
const drift = (front: string) => write("drifts/0001-d.md", `---\n${front}\n---\n# D\n`);

describe("malformed Task files give domain errors naming the file", () => {
  const cases: [string, string, RegExp][] = [
    ["refs is a string", "refs: order/Paid", /"refs" must be a list of strings/],
    ["refs has a non-string item", "refs:\n  - order\n  - 3", /"refs" must be a list of strings/],
    ["refs is a mapping", "refs:\n  a: b", /"refs" must be a list of strings/],
    ["unknown column", "column: blocked\nrefs: [order]", /"column" must be one of todo, doing, done/],
    ["technical is not a boolean", "technical: maybe\nrefs: [order]", /"technical" must be true or false/],
    ["agent is neither a boolean nor a holder", "agent: [3]\nrefs: [order]", /"agent" must be true or false/],
    ["non-technical without refs", "column: todo", /must reference at least one Model element in "refs"/],
    ["technical with refs", "technical: true\nrefs: [order]", /Technical Task cannot reference the Model/],
    ["drift is not an id", "refs: [order]\ndrift: abc", /"drift" must be a card ID/],
    ["front matter is a list", "- a\n- b", /front matter must be a mapping, not a list/],
    ["front matter is a scalar", "just text", /front matter must be a mapping, not a string/],
    ["invalid YAML", "refs: [order", /invalid YAML front matter/],
  ];
  for (const [name, front, expected] of cases) {
    test(name, () => {
      const file = task(front);
      expect(() => getTask(p, "1")).toThrow(expected);
      expect(() => getTask(p, "1")).toThrow(file);
      expect(() => listTasks(p)).toThrow(TramaError);
    });
  }

  test("a file without front matter", () => {
    write("tasks/0001-t.md", "# T\n");
    expect(() => getTask(p, "1")).toThrow(/missing YAML front matter/);
  });

  test("an unquoted numeric ID, which YAML reads as a number, is normalised", () => {
    task("refs: [order]\ndrift: 0003");
    expect(getTask(p, "1").data.drift).toBe("0003");
  });

  test("a technical Task with no refs loads", () => {
    task("technical: true");
    expect(getTask(p, "1").data).toMatchObject({ technical: true, refs: [], column: "todo" });
  });

  test("a Task is free unless its file says the agent has taken it", () => {
    task("technical: true");
    expect(getTask(p, "1").data.agent).toBe(false);
    task("technical: true\nagent: true");
    expect(getTask(p, "1").data.agent).toBe(true);
  });
});

describe("malformed Proposal files", () => {
  const cases: [string, string, RegExp][] = [
    ["delete is a string", "status: open\ndelete: checkout/order.md", /"delete" must be a list of strings/],
    ["unknown status", "status: pending", /"status" must be one of draft, open, approved, rejected, discarded/],
    ["base is a list", "base:\n  - checkout/order.md", /"base" must map file paths to hashes/],
    ["base has a non-string hash", "base:\n  checkout/order.md: 5", /"base" must map file paths to hashes/],
    ["base path escapes the Model", 'base:\n  "../../secret.md": new', /must be relative to \.trama\/model\//],
    ["delete path is not a Markdown file", "delete:\n  - checkout/order.txt", /not a Model or Requirement file/],
  ];
  for (const [name, front, expected] of cases) {
    test(name, () => {
      const file = proposal(front);
      expect(() => getProposal(p, "1")).toThrow(expected);
      expect(() => getProposal(p, "1")).toThrow(file);
      expect(() => listProposals(p)).toThrow(TramaError);
    });
  }

  test("a Proposal folder without proposal.md", () => {
    mkdirSync(join(p.dir, "proposals/0001-empty"), { recursive: true });
    expect(() => getProposal(p, "1")).toThrow(/proposal\.md: file not found/);
  });

  test("missing optional fields fall back to an open Proposal that touches nothing", () => {
    proposal("status: open");
    expect(getProposal(p, "1").data).toEqual({ status: "open", kind: "change", automatic: false, nonBlocking: false, drifts: [], requires: [], base: {}, delete: [], request: null, created: null, scanScope: null, label: null });
  });
});

describe("malformed Drift files", () => {
  test("unknown resolution and non-list refs", () => {
    drift("resolution: maybe");
    expect(() => getDrift(p, "1")).toThrow(/"resolution" must be one of fix-code, proposal, dismissed/);
    drift("refs: order");
    expect(() => listDrifts(p)).toThrow(/"refs" must be a list of strings/);
  });
});

describe("the CLI reports them instead of crashing", () => {
  test("`board` fails with a TramaError that names the broken file", () => {
    const file = task("refs: order/Paid");
    expect(() => run(["--root", dir, "project", "show"], dir)).toThrow(TramaError);
    expect(() => run(["--root", dir, "project", "show"], dir)).toThrow(file);
  });
});
