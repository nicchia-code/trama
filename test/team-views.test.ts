import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { linkGithubProject, type ProjectFields } from "../src/core/github";
import { rosterOf } from "../src/core/issues";
import { setManagerMode } from "../src/core/manager-mode";
import { approveProposal, editInProposal, getProposal, newProposal, setIssueField, submitProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { fieldRulesOf, handoffViews, issueRows, teamViews, unsetName } from "../src/core/team-views";

let dir: string;
let p: Project;

function git(...args: string[]): void {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-team-views-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  git("init", "-q");
  git("remote", "add", "origin", "https://github.com/acme/web");
  p = projectAt(dir);
  setManagerMode(p, true);
}, 60_000);
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const team = rosterOf([{ handle: "ada" }, { handle: "bob" }]);

/** A handoff with one issue per `[title, estimate]`, handed over. Returns the identities. */
function openHandoff(title: string, label: string, issues: [string, number][]): { id: string; issues: string[] } {
  const id = newProposal(p, title, "Why.", { kind: "handoff", label }).id;
  const ids = issues.map(([name, estimate]) => {
    const file = editInProposal(p, id, `issues/${name}.md`);
    writeFileSync(file, `---\nrefs: []\nestimate: ${estimate}\nassignee: ada\nreviewer: bob\nsprint: Sprint 4\n---\n\n# ${name}\n\nWhat to do for ${name}.\n`);
    return basename(file).slice(0, 8);
  });
  submitProposal(p, id, [], { team });
  return { id, issues: ids };
}

const link = (): void => void linkGithubProject(p, { owner: "acme", number: 1, title: "Roadmap", iteration: true });

describe("the open handoffs of the Decisions tab", () => {
  test("only an open handoff has a card: a Draft being written has none, and the Snapshot carries the cards", () => {
    const draft = newProposal(p, "Draft work", "Why.", { kind: "handoff", label: "Draft" }).id;
    expect(handoffViews(p)).toEqual([]);
    const { id } = openHandoff("Cancel work", "Cancel", [["first", 2]]);
    expect(getProposal(p, draft).data.status).toBe("draft");
    expect(handoffViews(p).map((h) => h.id)).toEqual([id]);
    expect(buildSnapshot(p).handoffs.map((h) => h.id)).toEqual([id]);
    // A handoff is in no other list of the Snapshot: not the Board's, nor the count of Proposals.
    expect(buildSnapshot(p).proposals.map((x) => x.id)).not.toContain(id);
  });

  test("a card says how many issues it creates, what it changes, its label, its warnings and why it cannot be approved", () => {
    const { id } = openHandoff("Cancel work", "Cancel", [
      ["short", 2],
      ["long", 5],
    ]);
    const [view] = handoffViews(p);
    expect(view).toMatchObject({ id, title: "Cancel work", label: "Cancel", files: 0, machines: 0 });
    // The issues of an open handoff have no creation instant yet, so their identities, drawn at random, order them: the assertions do not rely on it.
    expect(view?.issues.map((i) => i.title).sort()).toEqual(["long", "short"]);
    // The long issue has a warning of its own; the warnings of the handoff count both.
    expect(view?.issues.find((i) => i.title === "long")?.warnings.some((w) => w.startsWith("Estimated 5 d"))).toBe(true);
    expect(view?.warnings).toBeGreaterThanOrEqual(1);
    // Without a linked Project the first reason to wait is that.
    expect(view?.block).toMatchObject({ kind: "project", reason: "Link a GitHub Project first" });
    link();
    expect(handoffViews(p)[0]?.block).toBeNull();
  });

  test("an issue previews its body as GitHub will show it, with the Manager's reviewer and without the block of references", () => {
    openHandoff("Cancel work", "Cancel", [["first", 2]]);
    const [view] = handoffViews(p);
    const issue = view?.issues[0];
    expect(issue?.body).toContain("**Reviewer:** @bob");
    expect(issue?.body).toContain("What to do for first.");
    expect(issue?.body).not.toContain("<details>");
    expect(issue?.values).toMatchObject({ estimate: 2, assignee: "ada", reviewer: "bob", sprint: "Sprint 4" });
    expect(issue?.changed).toEqual([]);
  });

  test("a change of the Manager shows in the values, is marked changed and keeps the agent's value for Undo", () => {
    const { id, issues } = openHandoff("Cancel work", "Cancel", [["first", 2]]);
    const rules = fieldRulesOf(["ada", "bob", "cy"], null, "2026-10-25");
    setIssueField(p, id, issues[0] as string, "reviewer", "cy", rules);
    const issue = handoffViews(p)[0]?.issues[0];
    expect(issue?.values.reviewer).toBe("cy");
    expect(issue?.agent.reviewer).toBe("bob");
    expect(issue?.changed).toEqual(["reviewer"]);
    expect(issue?.body).toContain("**Reviewer:** @cy");
    // The agent's own value again is the undo.
    setIssueField(p, id, issues[0] as string, "reviewer", "bob", rules);
    expect(handoffViews(p)[0]?.issues[0]?.changed).toEqual([]);
  });
});

describe("the issues of the approved handoffs", () => {
  test("an approved handoff leaves the cards and its issues are rows, grouped by handoff and kept in publication order", () => {
    link();
    const first = openHandoff("Cancel work", "Cancel", [
      ["alpha", 2],
      ["beta", 1.5],
    ]);
    approveProposal(p, first.id, []);
    expect(handoffViews(p)).toEqual([]);
    const rows = issueRows(p);
    expect(rows.map((r) => r.title).sort()).toEqual(["alpha", "beta"]);
    expect(rows[0]).toMatchObject({ handoff: first.id, label: "Cancel", state: "publishing", number: null, url: null, assignee: "ada", sprint: "Sprint 4" });
    expect(buildSnapshot(p).issues.map((r) => r.id).sort()).toEqual([...first.issues].sort());
  });

  test("Publish again is blocked with its reason while the issues are being published, and the unset fields are named", () => {
    link();
    const h = openHandoff("Cancel work", "Cancel", [["alpha", 2]]);
    approveProposal(p, h.id, []);
    expect(issueRows(p)[0]?.publishBlock).toBe("The issues of this handoff are being published");
    expect(unsetName("fields.Priority")).toBe("Priority");
    expect(unsetName("estimate")).toBe("Estimate");
  });

  test("a card that cannot be read leaves its list empty and is reported, so the Snapshot still builds", () => {
    link();
    const h = openHandoff("Cancel work", "Cancel", [["alpha", 2]]);
    approveProposal(p, h.id, []);
    const card = issueRows(p)[0]?.id as string;
    writeFileSync(join(dir, ".trama", "issues", `${card}-broken.md`), "---\nstate: nonsense\n---\n\n# x\n\nbody\n");
    const views = teamViews(p);
    expect(views.issues).toEqual([]);
    expect(views.faults[0]?.file).toBe("issues/");
    expect(buildSnapshot(p).diagnostics.some((d) => d.file === "issues/")).toBe(true);
  });
});

describe("what the Manager's change of a field is checked against", () => {
  const project: ProjectFields = {
    fields: [
      { id: "F1", name: "Title", type: "TITLE" },
      { id: "F2", name: "Status", type: "SINGLE_SELECT", options: [{ id: "O1", name: "Todo" }] },
      { id: "F3", name: "Sprint", type: "ITERATION" },
      { id: "F4", name: "Points", type: "NUMBER" },
    ],
    iterations: [
      { id: "I1", title: "Sprint 1", startDate: "2026-10-12", duration: 7 },
      { id: "I2", title: "Sprint 2", startDate: "2026-10-26", duration: 7 },
    ],
  };

  test("the team's handles in lower case, the sprints with whether they ended, the fields the Manager can set", () => {
    const rules = fieldRulesOf(["Ada"], project, "2026-10-27");
    expect([...(rules.members ?? [])]).toEqual(["ada"]);
    expect(rules.sprints).toEqual([
      { title: "Sprint 1", ended: true },
      { title: "Sprint 2", ended: false },
    ]);
    expect(Object.keys(rules.fields ?? {})).toEqual(["Status", "Points"]);
    expect(rules.fields?.["Status"]).toEqual({ kind: "single-select", options: ["Todo"] });
    expect(rules.fields?.["Points"]).toEqual({ kind: "number" });
  });

  test("what is not known yet is null, so no value that needs it is accepted", () => {
    expect(fieldRulesOf(null, null, "2026-10-27")).toEqual({ members: null, sprints: null, fields: null });
  });
});
