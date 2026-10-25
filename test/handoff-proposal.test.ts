import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { announce } from "../src/core/announcements";
import { run } from "../src/cli/main";
import { linkGithubProject } from "../src/core/github";
import { type FieldRules, issuesDir, listIssues, listProposalIssues, rosterOf, type TeamRoster } from "../src/core/issues";
import { MANAGER_OFF, setManagerMode } from "../src/core/manager-mode";
import {
  approvalBlock,
  approveProposal,
  deleteInProposal,
  editInProposal,
  getProposal,
  handoffCoverage,
  health,
  listProposals,
  newProposal,
  proposalWarnings,
  setIssueField,
  submitProposal,
  validateProposal,
} from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { listTasks } from "../src/core/work";

const GIT_TEST_MS = 60_000;

let dir: string;
let p: Project;

function git(...args: string[]): void {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-handoff-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  git("init", "-q");
  git("remote", "add", "origin", "https://github.com/acme/web");
  p = projectAt(dir);
  setManagerMode(p, true);
}, GIT_TEST_MS);
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});
const team: TeamRoster = rosterOf([{ handle: "Ada" }, { handle: "bob" }, { handle: "cy" }]);
const rules: FieldRules = { members: new Set(["ada", "bob", "cy"]), sprints: [{ title: "Sprint 4", ended: false }, { title: "Sprint 1", ended: true }], fields: { Area: { kind: "single-select", options: ["Web", "API"] } } };

const link = (): void => void linkGithubProject(p, { owner: "acme", number: 1, title: "Roadmap", iteration: true });

interface IssueSpec {
  title?: string;
  body?: string;
  front?: string;
}

/** A new issue file in the handoff, written as the agent would: front matter, then the H1 title and the body. Returns its file. */
function writeIssue(handoff: string, name: string, spec: IssueSpec = {}): string {
  const file = editInProposal(p, handoff, `issues/${name}.md`);
  const front = spec.front ?? "refs: []\nestimate: 2\nassignee: ada\nreviewer: bob\n";
  const title = spec.title ?? name;
  writeFileSync(file, `---\n${front}---\n\n# ${title}\n\n${spec.body ?? `What to do for ${title}.`}\n`);
  return file;
}

/** A handoff with one valid issue, still a Draft. */
function handoffWith(front?: string): { id: string; issue: string } {
  const id = newProposal(p, "Cancel work", "Why.", { kind: "handoff", label: "Cancel" }).id;
  const issue = basename(writeIssue(id, "first", front === undefined ? {} : { front })).slice(0, 8);
  return { id, issue };
}

describe("a handoff is a Proposal that holds issues", () => {
  test("it is refused, creating nothing, when Team is not available", () => {
    setManagerMode(p, false);
    const before = existsSync(join(dir, ".trama", "proposals")) ? readdirSync(join(dir, ".trama", "proposals")) : [];
    expect(() => newProposal(p, "Cancel work", "Why.", { kind: "handoff", label: "Cancel" })).toThrow(MANAGER_OFF);
    expect(existsSync(join(dir, ".trama", "proposals")) ? readdirSync(join(dir, ".trama", "proposals")) : []).toEqual(before);
  });

  test("an issue file gets a fresh identity, is rewritten by its full name and sends an open handoff back to Draft", () => {
    const { id, issue } = handoffWith();
    expect(issue).toMatch(/^[a-z0-9]{8}$/);
    expect(getProposal(p, id).issues.map((i) => i.title)).toEqual(["first"]);
    submitProposal(p, id, [], { team });
    expect(getProposal(p, id).data.status).toBe("open");

    const file = join(getProposal(p, id).dir, "issues", getProposal(p, id).issues[0]?.name as string);
    expect(editInProposal(p, id, `issues/${basename(file)}`)).toBe(file);
    expect(getProposal(p, id).data.status).toBe("draft");
    expect(health(p, getProposal(p, id)).stale).toEqual([]);
  });

  test("an issue never takes the identity of a Task, of another issue or of a card", () => {
    const { id } = handoffWith();
    const second = writeIssue(id, "second");
    const ids = getProposal(p, id).issues.map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
    expect(basename(second)).toMatch(/^[a-z0-9]{8}-second\.md$/);
  });

  test("deleting an issue removes its file; a name that is not there is refused", () => {
    const { id } = handoffWith();
    const file = writeIssue(id, "gone");
    deleteInProposal(p, id, `issues/${basename(file)}`);
    expect(existsSync(file)).toBe(false);
    expect(() => deleteInProposal(p, id, `issues/${basename(file)}`)).toThrow(/is not an issue file/);
  });

  test("only a handoff holds issues, and a handoff holds no Task", () => {
    const change = newProposal(p, "Design", "", { label: "Design" }).id;
    expect(() => editInProposal(p, change, "issues/x.md")).toThrow(/not a handoff/);
    const { id } = handoffWith();
    expect(() => editInProposal(p, id, "tasks/x.md")).toThrow(/handoff holds issues/);
  });

  test("the issues of handoffs being written or open are listed with their handoff and label", () => {
    const { id } = handoffWith();
    expect(listProposalIssues(p).map((i) => ({ handoff: i.handoff, label: i.label, status: i.status }))).toEqual([{ handoff: id, label: "Cancel", status: "draft" }]);
  });
});

describe("the hand-over of a handoff", () => {
  const refused = (id: string, roster: TeamRoster | null = team): string => {
    try {
      submitProposal(p, id, [], roster === null ? {} : { team: roster });
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("the hand-over was not refused");
  };

  test("a valid handoff is handed over, and the Draft becomes Open", () => {
    const { id } = handoffWith();
    const done = submitProposal(p, id, [], { team });
    expect(done.data.status).toBe("open");
    expect(done.warnings).toEqual([]);
  });

  test("it is refused when Team is not available, or when the editor did not answer, with the reason", () => {
    const { id } = handoffWith();
    expect(refused(id, null)).toContain("the members of the team were not read from the editor");
    expect(refused(id, { reason: "No team is set." })).toContain("No team is set.");
    setManagerMode(p, false);
    expect(refused(id)).toContain(MANAGER_OFF);
    expect(getProposal(p, id).data.status).toBe("draft");
  });

  test("a handoff with no issue is refused", () => {
    const id = newProposal(p, "Cancel work", "Why.", { kind: "handoff", label: "Cancel" }).id;
    expect(refused(id)).toContain("needs at least one issue");
  });

  test("an issue with no title, or an empty body, is refused naming its file", () => {
    const { id } = handoffWith();
    const file = editInProposal(p, id, "issues/blank.md");
    writeFileSync(file, "---\nrefs: []\nestimate: 1\n---\n\n# Only a title\n");
    const message = refused(id);
    expect(message).toContain("has an empty body");
    writeFileSync(file, "---\nrefs: []\nestimate: 1\n---\n\nNo heading here.\n");
    expect(refused(id)).toContain("has no H1 title");
  });

  test("an assignee or a reviewer outside the team, or the same person for both, is refused", () => {
    const outside = handoffWith("refs: []\nestimate: 1\nassignee: eve\nreviewer: bob\n");
    expect(refused(outside.id)).toContain("@eve, who is not a member of the team");
    const same = handoffWith("refs: []\nestimate: 1\nassignee: ada\nreviewer: Ada\n");
    expect(refused(same.id)).toContain("the same person");
    const lower = handoffWith("refs: []\nestimate: 1\nassignee: ADA\n");
    expect(submitProposal(p, lower.id, [], { team }).data.status).toBe("open");
  });

  test("an estimate that is not a number of days from 0.5 in steps of 0.5 is refused", () => {
    for (const estimate of ["0", "0.3", "-1", "1.25"]) {
      const { id } = handoffWith(`refs: []\nestimate: ${estimate}\n`);
      expect(refused(id)).toContain("needs an estimate");
    }
    const missing = handoffWith("refs: []\n");
    expect(refused(missing.id)).toContain("needs an estimate");
    const half = handoffWith("refs: []\nestimate: 0.5\n");
    expect(submitProposal(p, half.id, [], { team }).data.status).toBe("open");
  });

  test("a dependency outside the handoff and its required handoffs, a self dependency and a cycle are refused", () => {
    const { id, issue } = handoffWith();
    const other = basename(writeIssue(id, "other", { front: `refs: []\nestimate: 1\ndependsOn: [zzzzzzzz]\n` })).slice(0, 8);
    expect(refused(id)).toContain("neither an issue of this handoff nor of a handoff it requires");
    writeIssue(id, `${other}-other`, { front: `refs: []\nestimate: 1\ndependsOn: [${other}]\n` });
    expect(refused(id)).toContain("depends on itself");
    writeIssue(id, `${other}-other`, { front: `refs: []\nestimate: 1\ndependsOn: [${issue}]\n` });
    writeIssue(id, `${issue}-first`, { front: `refs: []\nestimate: 2\nassignee: ada\nreviewer: bob\ndependsOn: [${other}]\n` });
    expect(refused(id)).toContain("make a cycle");
  });

  test("a dependency on an issue of a handoff the handoff requires is accepted", () => {
    const first = handoffWith();
    submitProposal(p, first.id, [], { team });
    link();
    approveProposal(p, first.id);
    const second = newProposal(p, "More work", "Why.", { kind: "handoff", label: "More", requires: [first.id] }).id;
    writeIssue(second, "later", { front: `refs: []\nestimate: 1\ndependsOn: [${first.issue}]\n` });
    expect(submitProposal(p, second, [], { team }).data.status).toBe("open");
  });

  test("a reference that does not exist with the handoff applied is refused", () => {
    const { id } = handoffWith("refs: [nothing/Here]\nestimate: 1\n");
    expect(refused(id)).toContain("nothing/Here");
  });

  test("the label is required, at most 30 characters, on one line", () => {
    const id = newProposal(p, "Cancel work", "Why.", { kind: "handoff" }).id;
    writeIssue(id, "first");
    expect(refused(id)).toContain("needs a label");
  });

  test("a handoff that holds a tasks/ folder is a validation error", () => {
    const { id } = handoffWith();
    const folder = join(getProposal(p, id).dir, "tasks");
    mkdirSync(folder);
    writeFileSync(join(folder, "aaaaaaaa-stray.md"), "---\ntechnical: false\nrefs: []\n---\n\n# Stray\n");
    expect(validateProposal(p, getProposal(p, id), "handles" in team ? team.handles : undefined).map((d) => d.message).join("\n")).toContain("a handoff holds issues in issues/, not Tasks");
  });

  test("the command line refuses the hand-over when the editor did not answer, and creates nothing", () => {
    const { id } = handoffWith();
    expect(() => cli("proposal", "move", id, "open")).toThrow("the members of the team were not read from the editor");
    expect(getProposal(p, id).data.status).toBe("draft");
  });
});

describe("the warnings of a handoff", () => {
  /** The Model change of an ordinary design: a new transition of Order, which scans one or more elements. */
  const changeModel = (id: string): void => {
    const file = editInProposal(p, id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("- `payment.DECLINED` → Cancelled: tells the customer by email.", "- `payment.DECLINED` → Cancelled: tells the customer by email.\n- `user.CANCEL` → Cancelled: the customer gives up."));
  };

  test("an entry of the scope that no issue names is a warning that does not refuse the hand-over", () => {
    const { id } = handoffWith();
    changeModel(id);
    const coverage = handoffCoverage(p, getProposal(p, id));
    expect(coverage.length).toBeGreaterThan(0);
    expect(coverage.every((entry) => entry.coveredBy.length === 0)).toBe(true);
    const done = submitProposal(p, id, [], { team });
    expect(done.warnings.map((w) => w.message)).toEqual(coverage.map((entry) => `Not covered: ${entry.ref}`));
  });

  test("an issue that names the element, or one that contains it, covers it", () => {
    const { id } = handoffWith();
    changeModel(id);
    const [entry] = handoffCoverage(p, getProposal(p, id));
    const ref = (entry as { ref: string }).ref;
    writeIssue(id, "covering", { front: `refs: [${JSON.stringify(ref)}]\nestimate: 1\n` });
    const after = handoffCoverage(p, getProposal(p, id)).find((e) => e.ref === ref);
    expect(after?.coveredBy).toHaveLength(1);
    expect(proposalWarnings(p, getProposal(p, id)).map((w) => w.message)).not.toContain(`Not covered: ${ref}`);
  });

  test("an issue estimated more than 3 days is a warning, the Manager's change applied", () => {
    const { id, issue } = handoffWith("refs: []\nestimate: 4\nassignee: ada\nreviewer: bob\n");
    expect(proposalWarnings(p, getProposal(p, id)).map((w) => w.message)).toEqual(["Estimated 4 d: more than 3 days per issue"]);
    const done = submitProposal(p, id, [], { team });
    expect(done.warnings.map((w) => w.message)).toEqual(["Estimated 4 d: more than 3 days per issue"]);
    setIssueField(p, id, issue, "estimate", 3, rules);
    expect(proposalWarnings(p, getProposal(p, id))).toEqual([]);
    setIssueField(p, id, issue, "estimate", 3.5, rules);
    expect(proposalWarnings(p, getProposal(p, id)).map((w) => w.message)).toEqual(["Estimated 3.5 d: more than 3 days per issue"]);
  });
});

describe("the Manager's changes to the fields of an issue", () => {
  const open = (front?: string) => {
    const handoff = handoffWith(front);
    submitProposal(p, handoff.id, [], { team });
    return handoff;
  };
  const managerOf = (id: string, issue: string) => getProposal(p, id).issues.find((i) => i.id === issue)?.data.manager;

  test("a change is written only in `manager`, keeps the agent's value and leaves the handoff Open, neither stale nor blocked", () => {
    const { id, issue } = open();
    const before = getProposal(p, id);
    link();
    setIssueField(p, id, issue, "assignee", "cy", rules);
    setIssueField(p, id, issue, "estimate", 1.5, rules);
    setIssueField(p, id, issue, "sprint", "Sprint 4", rules);
    setIssueField(p, id, issue, "fields.Area", "API", rules);
    const after = getProposal(p, id);
    expect(after.data.status).toBe("open");
    expect(after.data.base).toEqual(before.data.base);
    expect(health(p, after).stale).toEqual([]);
    expect(approvalBlock(p, id)).toBeNull();
    const file = after.issues.find((i) => i.id === issue);
    expect(file?.data.assignee).toBe("ada");
    expect(file?.data.estimate).toBe(2);
    expect(managerOf(id, issue)).toEqual({ assignee: "cy", estimate: 1.5, sprint: "Sprint 4", "fields.Area": "API" });
  });

  test("choosing the agent's value again removes the key: that is the undo", () => {
    const { id, issue } = open();
    setIssueField(p, id, issue, "assignee", "cy", rules);
    setIssueField(p, id, issue, "assignee", "ada", rules);
    expect(managerOf(id, issue)).toEqual({});
    expect(readFileSync(getProposal(p, id).issues[0]?.path as string, "utf8")).not.toContain("manager");
    setIssueField(p, id, issue, "estimate", 1, rules);
    setIssueField(p, id, issue, "estimate", 2, rules);
    expect(managerOf(id, issue)).toEqual({});
  });

  test("the Manager can choose nobody, and the person chosen is checked against the other role", () => {
    const { id, issue } = open();
    setIssueField(p, id, issue, "reviewer", null, rules);
    expect(managerOf(id, issue)).toEqual({ reviewer: null });
    expect(() => setIssueField(p, id, issue, "reviewer", "ada", rules)).toThrow("The assignee and the reviewer must be two different people.");
    expect(() => setIssueField(p, id, issue, "assignee", "eve", rules)).toThrow("Choose a member of the team.");
  });

  test("a value the field does not accept is refused and nothing changes", () => {
    const { id, issue } = open();
    const text = readFileSync(getProposal(p, id).issues[0]?.path as string, "utf8");
    expect(() => setIssueField(p, id, issue, "estimate", 0.25, rules)).toThrow("Enter 0.5 days or more, in steps of 0.5.");
    expect(() => setIssueField(p, id, issue, "estimate", 0, rules)).toThrow("Enter 0.5 days or more, in steps of 0.5.");
    expect(() => setIssueField(p, id, issue, "sprint", "Sprint 1", rules)).toThrow("Choose a sprint that has not ended.");
    expect(() => setIssueField(p, id, issue, "sprint", "Sprint 9", rules)).toThrow("Choose a sprint that has not ended.");
    expect(() => setIssueField(p, id, issue, "fields.Area", "Mobile", rules)).toThrow("Choose one of the options of Area.");
    expect(() => setIssueField(p, id, issue, "fields.Nope", "x", rules)).toThrow("is not a field of the linked GitHub Project");
    expect(() => setIssueField(p, id, issue, "colour", "red", rules)).toThrow("is not a field of an issue");
    expect(readFileSync(getProposal(p, id).issues[0]?.path as string, "utf8")).toBe(text);
  });

  test("only on an open handoff: a Draft, an approved handoff and an unknown issue are refused", () => {
    const draft = handoffWith();
    expect(() => setIssueField(p, draft.id, draft.issue, "estimate", 1, rules)).toThrow("still being written");
    expect(() => setIssueField(p, draft.id, "zzzzzzzz", "estimate", 1, rules)).toThrow();
    submitProposal(p, draft.id, [], { team });
    expect(() => setIssueField(p, draft.id, "zzzzzzzz", "estimate", 1, rules)).toThrow("has no issue zzzzzzzz");
    const change = newProposal(p, "Design", "", { label: "Design" }).id;
    expect(() => setIssueField(p, change, draft.issue, "estimate", 1, rules)).toThrow(/not a handoff/);
  });

  test("an agent that rewrites another issue keeps the Manager's values of the one it does not rewrite", () => {
    const { id, issue } = open();
    setIssueField(p, id, issue, "assignee", "cy", rules);
    writeIssue(id, "extra");
    expect(getProposal(p, id).data.status).toBe("draft");
    expect(managerOf(id, issue)).toEqual({ assignee: "cy" });
  });
});

describe("the approval of a handoff", () => {
  test("it is blocked without a GitHub Project, then without Team, and refused changing nothing", () => {
    const { id } = handoffWith();
    submitProposal(p, id, [], { team });
    expect(approvalBlock(p, id)).toEqual({ kind: "project", reason: "Link a GitHub Project first" });
    expect(() => approveProposal(p, id)).toThrow("Link a GitHub Project first");
    expect(getProposal(p, id).data.status).toBe("open");
    expect(existsSync(issuesDir(p))).toBe(false);
    link();
    expect(approvalBlock(p, id)).toBeNull();
    setManagerMode(p, false);
    expect(approvalBlock(p, id)?.kind).toBe("team");
    expect(() => approveProposal(p, id)).toThrow(MANAGER_OFF);
    expect(getProposal(p, id).data.status).toBe("open");
  });

  test("approving applies the files, creates no Task and writes one card per issue, the Manager's values applied", () => {
    const { id, issue } = handoffWith("refs: []\nestimate: 2\nassignee: ada\nreviewer: bob\nfields:\n  Area: Web\n");
    const file = editInProposal(p, id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\nNothing more happens."));
    submitProposal(p, id, [], { team });
    link();
    setIssueField(p, id, issue, "assignee", "cy", rules);
    setIssueField(p, id, issue, "fields.Area", "API", rules);
    const tasksBefore = listTasks(p).length;

    const approved = approveProposal(p, id);
    expect(approved.data.status).toBe("approved");
    expect(approved.issues).toEqual([issue]);
    expect(listTasks(p)).toHaveLength(tasksBefore);
    expect(readFileSync(join(dir, ".trama", "model", "checkout", "order.md"), "utf8")).toContain("Nothing more happens.");
    const [card, ...rest] = listIssues(p);
    expect(rest).toEqual([]);
    expect(card).toMatchObject({ id: issue, title: "first", body: "What to do for first." });
    expect(card?.data).toMatchObject({ handoff: id, label: "Cancel", assignee: "cy", reviewer: "bob", estimate: 2, fields: { Area: "API" }, state: "publishing", number: null, url: null });
    expect(card?.data.created).not.toBeNull();
    expect(readFileSync(card?.path as string, "utf8")).not.toContain("manager");
    expect(approvalBlock(p, id)?.kind).toBe("approved");
  });

  test("a card that cannot be created refuses the approval before any file changes", () => {
    const { id, issue } = handoffWith();
    submitProposal(p, id, [], { team });
    link();
    const clash = join(issuesDir(p), `${issue}-clash.md`);
    mkdirSync(issuesDir(p), { recursive: true });
    writeFileSync(clash, `---\nhandoff: ${id}\nlabel: Cancel\n---\n\n# Clash\n\nBody.\n`);
    expect(() => approveProposal(p, id)).toThrow(`already has an issue ${issue}`);
    expect(getProposal(p, id).data.status).toBe("open");
    expect(readdirSync(issuesDir(p)).filter((name) => name.endsWith(".md"))).toEqual([basename(clash)]);
  });

  test("approving through the command line leaves the issues waiting to be published again, as no agent was asked", () => {
    const { id, issue } = handoffWith();
    submitProposal(p, id, [], { team });
    link();
    const result = cli("--json", "proposal", "move", id, "approved");
    expect(result.exit).toBe(0);
    expect(JSON.parse(result.out)).toMatchObject({ status: "approved", issues: [issue] });
    const [card] = listIssues(p);
    expect(card?.data).toMatchObject({ state: "not-published", agent: null });
    expect(card?.data.reason).toContain("Publish again");
  });

  test("the decision of a handoff that is rejected leaves no issue", () => {
    const { id } = handoffWith();
    submitProposal(p, id, [], { team });
    link();
    const result = cli("proposal", "move", id, "rejected");
    expect(result.exit).toBe(0);
    expect(getProposal(p, id).data.status).toBe("rejected");
    expect(existsSync(issuesDir(p)) ? listIssues(p) : []).toEqual([]);
  });
});

describe("what the command line and the Board show of a handoff", () => {
  test("`proposal show` prints Issues and Warnings, not Tasks, and with --json `issues` and `warnings`", () => {
    const { id, issue } = handoffWith("refs: []\nestimate: 4\nassignee: ada\nreviewer: bob\n");
    submitProposal(p, id, [], { team });
    setIssueField(p, id, issue, "assignee", "cy", rules);
    const shown = cli("proposal", "show", id).out;
    expect(shown).toContain("## Issues");
    expect(shown).toContain("## Warnings");
    expect(shown).toContain("Estimated 4 d: more than 3 days per issue");
    expect(shown).toContain("(changed by the Manager)");
    expect(shown).not.toContain("## Tasks");
    const json = JSON.parse(cli("--json", "proposal", "show", id).out) as { issues: { id: string; assignee: string; manager: Record<string, unknown> }[]; warnings: { message: string }[] };
    expect(json.issues.map((i) => ({ id: i.id, assignee: i.assignee, manager: i.manager }))).toEqual([{ id: issue, assignee: "cy", manager: { assignee: "cy" } }]);
    expect(json.warnings.map((w) => w.message)).toEqual(["Estimated 4 d: more than 3 days per issue"]);
  });

  test("`proposal show` of a handoff lists, for each scope entry, the issues that cover it or `not covered (warning)`", () => {
    const { id } = handoffWith();
    const file = editInProposal(p, id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", "### Cancelled (final)\nNothing more happens."));
    expect(cli("proposal", "show", id).out).toContain("not covered (warning)");
  });

  test("`issue show` reads an issue of a handoff that is not approved yet, with the Manager's changes applied", () => {
    const { id, issue } = handoffWith();
    submitProposal(p, id, [], { team });
    setIssueField(p, id, issue, "assignee", "cy", rules);
    const json = JSON.parse(cli("--json", "issue", "show", issue).out) as { approved: boolean; assignee: string; handoff: string; label: string };
    expect(json).toMatchObject({ approved: false, assignee: "cy", handoff: id, label: "Cancel" });
  });

  test("`proposal new --help` lists handoff among the kinds", () => {
    expect(cli("proposal", "new", "--help").out).toContain("handoff");
  });

  test("a handoff never shows on the Board, in the snapshot's Proposals or in the text of the Board", () => {
    const { id } = handoffWith();
    const ordinary = newProposal(p, "Design", "", { label: "Design" }).id;
    submitProposal(p, ordinary);
    submitProposal(p, id, [], { team });
    expect(listProposals(p).map((x) => x.id)).toContain(id);
    expect(buildSnapshot(p).proposals.map((v) => v.id)).toEqual([ordinary]);
    const board = cli("project", "show").out;
    expect(board).not.toContain("Cancel work");
    expect(board).toContain("Design");
  });

  test("the ghost of a handoff being written is no ghost of the Board, and the ghost of an ordinary Draft is", () => {
    const { id } = handoffWith();
    const ordinary = newProposal(p, "Design", "", { label: "Design" }).id;
    announce(p, { kind: "proposal", title: "Cancel work", proposal: id });
    announce(p, { kind: "proposal", title: "Design", proposal: ordinary });
    expect(buildSnapshot(p).announcements.map((a) => a.title)).toEqual(["Design"]);
  });
});
