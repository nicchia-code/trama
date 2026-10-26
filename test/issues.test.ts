import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { loadProject } from "../src/core/requirements";
import { referenceFingerprint } from "../src/core/describe";
import {
  beginPublishing,
  editIssue,
  findIssue,
  githubBody,
  goneIssues,
  handoffBeingWritten,
  type Issue,
  type IssueData,
  issuesDir,
  issuesOfHandoff,
  listIssues,
  moveIssue,
  publicationOrder,
  publishAgainBlock,
  publishingIssues,
  REPLANNING_TITLE,
  replanHandoffsBlock,
  replanRunning,
  type ReplanFacts,
  saveIssue,
  STOPPED_REASON,
  stopPublishing,
} from "../src/core/issues";
import { MANAGER_NEEDS_GITHUB, MANAGER_OFF, setManagerMode } from "../src/core/manager-mode";
import { setSoloMode } from "../src/core/solo-mode";
import { createdNow, type Project, projectAt, readTextLf, slugify, writeFileEnsuringDir } from "../src/core/store";
import { newProposal } from "../src/core/proposals";

const GIT_TEST_MS = 60_000;

let dir: string;
let p: Project;
let handoff: string;

function git(...args: string[]): void {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-issues-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  git("init", "-q");
  git("remote", "add", "origin", "https://github.com/acme/web");
  p = projectAt(dir);
  setManagerMode(p, true);
  handoff = newProposal(p, "Cancel work", "Why.", { label: "Cancel" }).id;
}, GIT_TEST_MS);
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});
/** The JSON a command prints, read as the shape the test expects of it. */
const json = <T>(...args: string[]): T => JSON.parse(cli("--json", ...args).out);

/** An issue card in `.trama/issues/`, created now (so cards come in the order they are made). */
function card(id: string, title: string, data: Partial<IssueData> = {}, body = `What to do for ${title}.`): Issue {
  const name = `${id}-${slugify(title)}.md`;
  const issue: Issue = {
    id,
    name,
    path: join(issuesDir(p), name),
    title,
    body,
    data: { handoff, label: "Cancel", refs: ["order/Paid"], estimate: 2, assignee: "ada", reviewer: "bob", sprint: null, fields: {}, dependsOn: [], created: createdNow(), state: "publishing", number: null, url: null, published: null, unset: [], reason: null, updated: null, texts: {}, agent: null, ...data },
  };
  saveIssue(issue);
  return issue;
}

describe("the body composed for GitHub", () => {
  const base = { body: "## Context\n\nWhy.", reviewer: "bob", dependencies: [], refs: ["order/Paid", "requirements/ui#panel"], solo: false };

  test("reviewer line, dependency line, an empty line, the body and the folded references", () => {
    const body = githubBody({ ...base, dependencies: [{ number: 12, title: "A" }, { number: 13, title: "B" }] });
    expect(body).toBe(
      "**Reviewer:** @bob\n**Depends on:** #12, #13\n\n## Context\n\nWhy.\n\n<details><summary>Trama references</summary>\n\n- `order/Paid`\n- `requirements/ui#panel`\n\n</details>\n",
    );
  });

  test("an issue that is not published yet is named by its title", () => {
    expect(githubBody({ ...base, dependencies: [{ number: 12, title: "A" }, { number: null, title: "Later work" }] })).toContain("**Depends on:** #12, Later work\n");
  });

  test("without a reviewer or dependencies the body starts with the agent's text", () => {
    expect(githubBody({ ...base, reviewer: null })).toStartWith("## Context");
    expect(githubBody({ ...base, reviewer: null, dependencies: [{ number: 3, title: "A" }] })).toStartWith("**Depends on:** #3\n\n## Context");
    expect(githubBody({ ...base, dependencies: [] })).toStartWith("**Reviewer:** @bob\n\n## Context");
  });

  test("with Solo mode on the references block is left out, and nothing else is added", () => {
    expect(githubBody({ ...base, solo: true })).toBe("**Reviewer:** @bob\n\n## Context\n\nWhy.\n");
    expect(githubBody({ ...base, reviewer: null, solo: true })).toBe("## Context\n\nWhy.\n");
  });

  test("an issue with no references has no block", () => {
    expect(githubBody({ ...base, refs: [] })).not.toContain("<details>");
  });

  test("`trama issue show` prints the same composition, with and without Solo mode, naming published dependencies by number and the others by title", () => {
    const first = card("aaaa1111", "First", { state: "published", number: 12, url: "https://github.com/acme/web/issues/12", published: createdNow() });
    const second = card("bbbb2222", "Second", { dependsOn: [first.id, "cccc3333"] });
    card("cccc3333", "Third");
    const shown = json<{ githubBody: string; approved: boolean }>("issue", "show", second.id);
    expect(shown.githubBody).toBe(githubBody({ body: second.body, reviewer: "bob", dependencies: [{ number: 12, title: "First" }, { number: null, title: "Third" }], refs: ["order/Paid"], solo: false }));
    expect(shown.githubBody).toContain("**Depends on:** #12, Third");
    expect(shown.approved).toBe(true);
    expect(cli("issue", "show", second.id).out).toContain("## GitHub body");
    git("config", "user.email", "t@example.com");
    setSoloMode(p, "folders");
    expect(json<{ githubBody: string }>("issue", "show", second.id).githubBody).not.toContain("<details>");
  });
});

describe("the order of publication", () => {
  const item = (id: string, created: string, dependsOn: string[] = []) => ({ id, data: { created, dependsOn } });

  test("the issues an issue depends on come first, the oldest first otherwise", () => {
    const order = publicationOrder([item("c", "2026-01-01T00:00:03Z", ["a"]), item("b", "2026-01-01T00:00:02Z"), item("a", "2026-01-01T00:00:04Z")]);
    expect(order.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  test("a dependency outside the list does not hold an issue back, and a cycle is broken at its oldest issue", () => {
    expect(publicationOrder([item("x", "2026-01-01T00:00:01Z", ["gone"])]).map((i) => i.id)).toEqual(["x"]);
    expect(publicationOrder([item("a", "2026-01-01T00:00:01Z", ["b"]), item("b", "2026-01-01T00:00:02Z", ["a"])]).map((i) => i.id)).toEqual(["a", "b"]);
  });

  test("`trama issue list` prints the order of publication, filters by handoff and state, and its JSON is a list", () => {
    card("aaaa1111", "Depends on later", { dependsOn: ["bbbb2222"] });
    card("bbbb2222", "Base work", { state: "not-published", reason: "GitHub refused it" });
    card("cccc3333", "Other handoff", { handoff: "zzzz9999" });
    const all = json<{ id: string; state: string; number: number | null; dependsOn: string[] }[]>("issue", "list");
    expect(all.map((i) => i.id)).toEqual(["bbbb2222", "aaaa1111", "cccc3333"]);
    expect(all[1]).toMatchObject({ state: "publishing", number: null, dependsOn: ["bbbb2222"] });
    expect(json<{ id: string }[]>("issue", "list", "--input", JSON.stringify({ state: "not-published" })).map((i) => i.id)).toEqual(["bbbb2222"]);
    expect(json<{ id: string }[]>("issue", "list", "--input", JSON.stringify({ handoff })).map((i) => i.id)).toEqual(["bbbb2222", "aaaa1111"]);
    const text = cli("issue", "list").out;
    expect(text).toContain("`bbbb2222` Base work — not-published (GitHub refused it)");
    expect(text.indexOf("bbbb2222")).toBeLessThan(text.indexOf("aaaa1111"));
    expect(issuesOfHandoff(p, handoff).map((i) => i.id)).toEqual(["bbbb2222", "aaaa1111"]);
  });
});

describe("the moves of an issue", () => {
  test("published records the number, the address, the moment and the fingerprint of the text of each reference", () => {
    const issue = card("aaaa1111", "Cancel order", { refs: ["order/Paid", "requirements/ui"], agent: "terminal-1" });
    const moved = moveIssue(p, issue.id, "published", { number: 12, url: "https://github.com/acme/web/issues/12" });
    expect(moved.data).toMatchObject({ state: "published", number: 12, url: "https://github.com/acme/web/issues/12", reason: null, agent: null });
    expect(Date.parse(moved.data.published as string)).not.toBeNaN();
    const project = loadProject(p);
    // The same function as the comparisons.
    expect(moved.data.texts).toEqual({ "order/Paid": referenceFingerprint(project, "order/Paid"), "requirements/ui": referenceFingerprint(project, "requirements/ui") });
    expect(findIssue(p, "aaaa1111").issue.id).toBe("aaaa1111");
    expect(readFileSync(issue.path, "utf8")).toContain("state: published");
  });

  test("not-published records the reason; publishing and an already published issue are refused, changing nothing", () => {
    const issue = card("aaaa1111", "Cancel order");
    expect(() => moveIssue(p, issue.id, "publishing")).toThrow(/Only Trama moves an issue to publishing/);
    expect(() => moveIssue(p, issue.id, "not-published", {})).toThrow(/needs the reason/);
    expect(() => moveIssue(p, issue.id, "published", { number: 1 })).toThrow(/needs the number and the address/);
    expect(moveIssue(p, issue.id, "not-published", { reason: "  GitHub refused the label  " }).data).toMatchObject({ state: "not-published", reason: "GitHub refused the label" });
    moveIssue(p, issue.id, "published", { number: 7, url: "https://github.com/acme/web/issues/7" });
    const before = readFileSync(issue.path, "utf8");
    expect(() => moveIssue(p, issue.id, "not-published", { reason: "late" })).toThrow(/already published as #7/);
    expect(() => moveIssue(p, issue.id, "published", { number: 8, url: "https://github.com/acme/web/issues/8" })).toThrow(/already published/);
    expect(readFileSync(issue.path, "utf8")).toBe(before);
  });

  test("`trama issue move` checks its input, and `edit` records unset fields and a Comment update only on a published issue", () => {
    const issue = card("aaaa1111", "Cancel order");
    expect(() => cli("issue", "move", issue.id, "published")).toThrow(/number and url: required/);
    expect(() => cli("issue", "move", issue.id, "not-published")).toThrow(/reason: required/);
    expect(() => cli("issue", "move", issue.id, "publishing")).toThrow(/Only Trama moves an issue to publishing/);
    expect(() => cli("issue", "edit", issue.id, "--input", JSON.stringify({ unset: ["sprint"] }))).toThrow(/not published/);
    const out = json<{ state: string; number: number }>("issue", "move", issue.id, "published", "--input", JSON.stringify({ number: 5, url: "https://github.com/acme/web/issues/5" }));
    expect(out).toMatchObject({ state: "published", number: 5 });
    expect(json<{ unset: string[] }>("issue", "edit", issue.id, "--input", JSON.stringify({ unset: ["assignee", "fields.Team", "assignee"] })).unset).toEqual(["assignee", "fields.Team"]);
    expect(() => editIssue(p, issue.id, { unset: ["colour"] })).toThrow(/is not a field/);
    expect(() => editIssue(p, issue.id, {})).toThrow(/Nothing to record/);
    expect(() => cli("issue", "edit", issue.id, "--input", JSON.stringify({ updated: false }))).toThrow();
    const updated = editIssue(p, issue.id, { updated: true });
    expect(Date.parse(updated.data.updated as string)).not.toBeNaN();
    expect(updated.data.unset).toEqual(["assignee", "fields.Team"]);
    expect(Object.keys(updated.data.texts)).toEqual(["order/Paid"]);
  });

  test("every issue command fails with the reason of Manager mode when Team is not available", () => {
    const issue = card("aaaa1111", "Cancel order");
    const commands = [["issue", "list"], ["issue", "show", issue.id], ["issue", "move", issue.id, "not-published", "--input", JSON.stringify({ reason: "x" })], ["issue", "edit", issue.id, "--input", JSON.stringify({ updated: true })]];
    setManagerMode(p, false);
    for (const command of commands) expect(() => cli(...command)).toThrow(MANAGER_OFF);
    git("remote", "set-url", "origin", "https://gitlab.com/acme/web");
    setManagerMode(projectAt(dir), false);
    writeFileEnsuringDir(join(p.dir, "manager", "mode.json"), "{}\n");
    for (const command of commands) expect(() => cli(...command)).toThrow(MANAGER_NEEDS_GITHUB);
  });
});

describe("who publishes an issue", () => {
  test("beginning a publication holds the handoff's issues that are not published, and a published one stays as it is", () => {
    card("aaaa1111", "Done", { state: "published", number: 1, url: "https://github.com/acme/web/issues/1" });
    card("bbbb2222", "Refused", { state: "not-published", reason: "refused" });
    card("cccc3333", "Waiting");
    card("dddd4444", "Elsewhere", { handoff: "zzzz9999", state: "not-published", reason: "refused" });
    expect(beginPublishing(p, handoff, "terminal-9")).toEqual(["bbbb2222", "cccc3333"]);
    expect(publishingIssues(p)).toEqual([
      { id: "bbbb2222", holder: "terminal-9", handoff },
      { id: "cccc3333", holder: "terminal-9", handoff },
    ]);
    const states = Object.fromEntries(listIssues(p).map((i) => [i.id, [i.data.state, i.data.reason]]));
    expect(states["aaaa1111"]).toEqual(["published", null]);
    expect(states["bbbb2222"]).toEqual(["publishing", null]);
    expect(states["dddd4444"]).toEqual(["not-published", "refused"]);
  });

  test("an issue whose agent is gone goes to Not published with the reason, only for the holder that is gone", () => {
    card("aaaa1111", "A", { agent: "terminal-1" });
    card("bbbb2222", "B", { agent: "terminal-2" });
    card("cccc3333", "C", { state: "published", number: 3, url: "https://github.com/acme/web/issues/3" });
    expect(stopPublishing(p, ["aaaa1111", "bbbb2222", "cccc3333"], STOPPED_REASON, "terminal-1").map((i) => i.id)).toEqual(["aaaa1111"]);
    const left = Object.fromEntries(listIssues(p).map((i) => [i.id, [i.data.state, i.data.reason, i.data.agent]]));
    expect(left["aaaa1111"]).toEqual(["not-published", "The agent stopped before publishing it.", null]);
    expect(left["bbbb2222"]).toEqual(["publishing", null, "terminal-2"]);
    expect(left["cccc3333"]?.[0]).toBe("published");
  });

  test("Publish again needs Team, a linked GitHub Project, no publication running and an issue that waits", () => {
    card("aaaa1111", "Refused", { state: "not-published", reason: "refused" });
    expect(publishAgainBlock(p, handoff)).toBe("Link a GitHub Project first");
    writeFileEnsuringDir(join(p.dir, "manager", "project.json"), `${JSON.stringify({ owner: "acme", number: 3, title: "Board" })}\n`);
    expect(publishAgainBlock(p, handoff)).toBeNull();
    card("bbbb2222", "Running");
    expect(publishAgainBlock(p, handoff)).toBe("The issues of this handoff are being published");
    expect(publishAgainBlock(p, "zzzz9999")).toBe("No issue of this handoff waits to be published");
    setManagerMode(p, false);
    expect(publishAgainBlock(p, handoff)).toBe(MANAGER_OFF);
  });
});

test("a publishing issue is gone when nobody follows its terminal and the registered process is not alive; one without a known publisher never is", () => {
  const publishing = [{ id: "aaaa1111", holder: "terminal-1" }, { id: "bbbb2222", holder: "terminal-2" }, { id: "cccc3333", holder: "terminal-3" }, { id: "dddd4444", holder: null }];
  const facts = { followedHere: (holder: string) => holder === "terminal-1", followedElsewhere: new Set(["terminal-2"]), terminalProcessAlive: () => false };
  expect(goneIssues(publishing, facts)).toEqual(["cccc3333"]);
  expect(goneIssues(publishing, { ...facts, terminalProcessAlive: (holder: string) => holder === "terminal-3" })).toEqual([]);
});

describe("what changed under a published issue", () => {
  const commit = (message: string) => {
    git("add", "-A");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message);
  };
  const orderFile = () => join(dir, ".trama", "model", "checkout", "order.md");
  // The example's files have CRLF in a Windows checkout: the edits are written against LF text.
  const edit = (change: (text: string) => string) => writeFileEnsuringDir(orderFile(), change(readTextLf(orderFile())));
  const publish = (refs = ["order/Paid"]) => {
    const issue = card("aaaa1111", "Cancel order", { refs });
    moveIssue(p, issue.id, "published", { number: 5, url: "https://github.com/acme/web/issues/5" });
    return issue.id;
  };
  type Changed = { ref: string; earlier: string | null; current: string | null }[];

  test("nothing changed: no changed reference and no section", () => {
    commit("base");
    const id = publish();
    expect(json<{ changed: Changed }>("issue", "show", id).changed).toEqual([]);
    expect(cli("issue", "show", id).out).not.toContain("## Changed since publishing");
  });

  test("a changed reference has its earlier text from git, the text it has now, and shows under Changed since publishing", () => {
    commit("base");
    const id = publish();
    edit((text) => text.replace("### Paid\n", "### Paid\nThe customer has paid and the shop owes a receipt.\n"));
    const { changed } = json<{ changed: Changed }>("issue", "show", id);
    expect(changed).toHaveLength(1);
    expect(changed[0]?.ref).toBe("order/Paid");
    expect(changed[0]?.earlier).toContain("user.CANCEL");
    expect(changed[0]?.earlier).not.toContain("owes a receipt");
    expect(changed[0]?.current).toContain("owes a receipt");
    const out = cli("issue", "show", id).out;
    expect(out).toContain("## Changed since publishing");
    expect(out).toContain("### `order/Paid`");
    expect(out).toContain("Earlier text:");
    expect(out).toContain("Current text:");
    expect(out.indexOf("## Changed since publishing")).toBeLessThan(out.indexOf("## GitHub body"));
  });

  test("without a commit from before the publication only the reference is named: the earlier text is not available", () => {
    const id = publish();
    edit((text) => text.replace("### Paid\n", "### Paid\nThe customer has paid and the shop owes a receipt.\n"));
    const { changed } = json<{ changed: Changed }>("issue", "show", id);
    expect(changed).toEqual([{ ref: "order/Paid", earlier: null, current: expect.stringContaining("owes a receipt") }]);
    expect(cli("issue", "show", id).out).toContain("_Not available: git does not have it._");
  });

  test("an earlier text that is not the one the recorded fingerprint stands for (the Model was not committed then) is not shown", () => {
    edit((text) => text.replace("### Paid\n", "### Paid\nA first draft.\n"));
    commit("base");
    // The publication recorded the text of the working copy, which is later than the commit.
    edit((text) => text.replace("A first draft.", "A second draft."));
    const id = publish();
    edit((text) => text.replace("A second draft.", "A third draft."));
    const { changed } = json<{ changed: Changed }>("issue", "show", id);
    expect(changed[0]?.earlier).toBeNull();
    expect(changed[0]?.current).toContain("A third draft.");
  });

  test("a reference that no longer exists is told, with no current text", () => {
    commit("base");
    const id = publish(["order/Refunding"]);
    edit((text) => text.replace("- `user.CANCEL` → Refunding: once preparation has started.\n", "").replace("### Refunding\n- `payment.REFUNDED` → Cancelled\n\n", ""));
    const { changed } = json<{ changed: Changed }>("issue", "show", id);
    expect(changed).toEqual([{ ref: "order/Refunding", earlier: expect.stringContaining("payment.REFUNDED"), current: null }]);
    expect(cli("issue", "show", id).out).toContain("This reference no longer exists in the Model or the Requirements.");
  });

  test("a Comment update forgets the change: the recorded text is the current one, and the next change counts from it", () => {
    commit("base");
    const id = publish();
    edit((text) => text.replace("### Paid\n", "### Paid\nThe customer has paid and the shop owes a receipt.\n"));
    expect(json<{ changed: Changed }>("issue", "show", id).changed).toHaveLength(1);
    cli("issue", "edit", id, "--input", JSON.stringify({ updated: true }));
    expect(json<{ changed: Changed }>("issue", "show", id).changed).toEqual([]);
    edit((text) => text.replace("owes a receipt.", "owes a receipt and an invoice."));
    const { changed } = json<{ changed: Changed }>("issue", "show", id);
    expect(changed).toHaveLength(1);
    expect(changed[0]?.current).toContain("an invoice");
  });

  test("an issue that is not published, or whose texts were not recorded, has no changed reference", () => {
    const waiting = card("bbbb2222", "Refund order");
    expect(json<{ changed: Changed }>("issue", "show", waiting.id).changed).toEqual([]);
    const old = card("cccc3333", "Ship order", { state: "published", number: 9, url: "https://github.com/acme/web/issues/9", texts: {} });
    edit((text) => text.replace("### Paid\n", "### Paid\nChanged.\n"));
    expect(json<{ changed: Changed }>("issue", "show", old.id).changed).toEqual([]);
  });
});

describe("when Replan is available (rules#developer.REPLAN_HANDOFFS)", () => {
  const ready: ReplanFacts = { linked: true, open: 2, finishing: false, writing: false, running: false, replanning: false };

  test("it is available when a Project is linked, a handoff is open and nothing else runs", () => {
    expect(replanHandoffsBlock(ready)).toBeNull();
    expect(replanHandoffsBlock({ ...ready, open: 1 })).toBeNull();
  });

  test("each reason alone is the reason", () => {
    expect(replanHandoffsBlock({ ...ready, linked: false })).toBe("Link a GitHub Project first");
    expect(replanHandoffsBlock({ ...ready, open: 0 })).toBe("No handoff waits for a decision");
    expect(replanHandoffsBlock({ ...ready, finishing: true })).toBe("The agent is still finishing");
    expect(replanHandoffsBlock({ ...ready, writing: true })).toBe("An agent is writing a handoff");
    expect(replanHandoffsBlock({ ...ready, running: true })).toBe("A run is in progress");
    expect(replanHandoffsBlock({ ...ready, replanning: true })).toBe("Replan is already running");
  });

  test("with several reasons the first in this order wins", () => {
    const all: ReplanFacts = { linked: false, open: 0, finishing: true, writing: true, running: true, replanning: true };
    expect(replanHandoffsBlock(all)).toBe("Link a GitHub Project first");
    expect(replanHandoffsBlock({ ...all, linked: true })).toBe("No handoff waits for a decision");
    expect(replanHandoffsBlock({ ...all, linked: true, open: 1 })).toBe("The agent is still finishing");
    expect(replanHandoffsBlock({ ...all, linked: true, open: 1, finishing: false })).toBe("An agent is writing a handoff");
    expect(replanHandoffsBlock({ ...all, linked: true, open: 1, finishing: false, writing: false })).toBe("A run is in progress");
    expect(replanHandoffsBlock({ ...all, linked: true, open: 1, finishing: false, writing: false, running: false })).toBe("Replan is already running");
  });

  test("a Replan runs while its announcement is live", () => {
    expect(REPLANNING_TITLE).toBe("Replanning handoffs");
    expect(replanRunning([])).toBe(false);
    expect(replanRunning([{ kind: "work", title: "Replanning handoffs" }])).toBe(true);
    expect(replanRunning([{ kind: "check", title: "Replanning handoffs" }, { kind: "work", title: "Splitting an issue" }])).toBe(false);
  });

  test("a handoff is written by a live work that is a request, a Rework with feedback or a Split, never by the other jobs", () => {
    expect(handoffBeingWritten([])).toBe(false);
    expect(handoffBeingWritten([{ kind: "work", title: "Splitting an issue" }])).toBe(true);
    expect(handoffBeingWritten([{ kind: "work", title: "Ship the refund policy" }])).toBe(true);
    expect(handoffBeingWritten([{ kind: "work", title: "Publishing issues" }, { kind: "work", title: "Updating #7" }, { kind: "work", title: "Importing from code" }, { kind: "work", title: "Replanning handoffs" }])).toBe(false);
    expect(handoffBeingWritten([{ kind: "check", title: "Scanning System" }, { kind: "proposal", title: "Resolve Drifts" }])).toBe(false);
  });
});
