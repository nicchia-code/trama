import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, run } from "../src/cli/main";
import { briefing } from "../src/core/compare";
import { linkGithubProject } from "../src/core/github";
import { listIssues, moveIssue, rosterOf } from "../src/core/issues";
import { setManagerMode } from "../src/core/manager-mode";
import { approveProposal, editInProposal, newProposal, submitProposal } from "../src/core/proposals";
import { askIssueStates, createQuestionServer, type IssueStateRead, QUESTION_ENDPOINT_ENV, type QuestionServer } from "../src/core/question-channel";
import { unavailableQuestions } from "../src/core/questions";
import { type Project, projectAt } from "../src/core/store";
import { publishedIssues, teamViews } from "../src/core/team-views";

let root: string;
let dir: string;
let runtimeDir: string;
let p: Project;
let servers: QuestionServer[];

function git(...args: string[]): void {
  console.error(`DBG ${Date.now()} git ${args.join(" ")}`);
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  console.error(`DBG ${Date.now()} git done ${r.status}`);
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
}

beforeEach(() => {
  console.error(`DBG ${Date.now()} beforeEach`);
  // A Unix socket path is limited to about 100 bytes: the system temp directory of macOS is already most of that.
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-pi-") : "/tmp/trama-pi-");
  dir = join(root, "project");
  runtimeDir = join(root, "runtime");
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  mkdirSync(runtimeDir);
  git("init", "-q");
  git("remote", "add", "origin", "https://github.com/acme/web");
  p = projectAt(dir);
  console.error(`DBG ${Date.now()} manager`);
  setManagerMode(p, true);
  console.error(`DBG ${Date.now()} link`);
  linkGithubProject(p, { owner: "acme", number: 1, title: "Roadmap", iteration: true });
  servers = [];
  console.error(`DBG ${Date.now()} beforeEach done`);
}, 60_000);
afterEach(async () => {
  await Promise.all(servers.map((server) => server.dispose()));
  rmSync(root, { recursive: true, force: true });
});

const team = rosterOf([{ handle: "ada" }, { handle: "bob" }]);

/** An approved handoff with one issue per `[title, refs]`, all published with the numbers from 126. Returns the identities of the cards. */
function publish(issues: [string, string[]][]): string[] {
  const id = newProposal(p, "Order work", "Why.", { kind: "handoff", label: "orders" }).id;
  for (const [name, refs] of issues) {
    const file = editInProposal(p, id, `issues/${name}.md`);
    writeFileSync(file, `---\nrefs: [${refs.join(", ")}]\nestimate: 1\nassignee: ada\nreviewer: bob\n---\n\n# ${name}\n\nWhat to do for ${name}.\n`);
  }
  submitProposal(p, id, [], { team });
  const { issues: cards } = approveProposal(p, id, []);
  // The numbers follow the order of `issues`, whatever order the cards were written in.
  const titled = new Map(listIssues(p).map((card) => [card.title, card.id]));
  issues.forEach(([name], index) => moveIssue(p, titled.get(name) as string, "published", { number: 126 + index, url: `https://github.com/acme/web/issues/${126 + index}` }));
  return cards;
}

describe("the published issues in the briefing of a comparison", () => {
  test("lists the published issues whose references fall in the Machine, with number, title and state as published when nothing was read", () => {
    publish([
      ["Paid orders", ["order/Paid"]],
      ["Payment", ["payment"]],
    ]);
    const b = briefing(p, "order", []);
    expect(b.issues).toEqual([{ number: 126, title: "Paid orders", status: "Open", refs: ["order/Paid"] }]);
  });

  test("the state is the one of the last read of the editor, and a Not planned issue is left out", () => {
    publish([
      ["Paid orders", ["order/Paid"]],
      ["Shipped orders", ["order/Shipped"]],
    ]);
    const b = briefing(p, "order", [], [{ number: 126, status: "In review" }, { number: 127, status: "Not planned" }]);
    expect(b.issues.map((i) => [i.number, i.status])).toEqual([[126, "In review"]]);
  });

  test("an issue that is not published, or whose references are in another Machine or outside the references asked for, is not listed", () => {
    const id = newProposal(p, "More work", "Why.", { kind: "handoff", label: "orders" }).id;
    writeFileSync(editInProposal(p, id, "issues/waiting.md"), "---\nrefs: [order/Paid]\nestimate: 1\nassignee: ada\nreviewer: bob\n---\n\n# Waiting\n\nBody.\n");
    submitProposal(p, id, [], { team });
    approveProposal(p, id, []);
    publish([["Paid orders", ["order/Paid"]]]);
    expect(briefing(p, "order", []).issues.map((i) => i.title)).toEqual(["Paid orders"]);
    expect(briefing(p, "order", ["order/Shipped"]).issues).toEqual([]);
    expect(briefing(p, "payment", []).issues).toEqual([]);
  });

  test("the command prints the section `## Published issues` with the rule for the Drifts, and adds `publishedIssues` to the JSON; without issues there is no section", () => {
    expect((console.error(`DBG ${Date.now()} cli`), run(["--root", dir, "comparison", "new", "order"], dir, {})).out).not.toContain("## Published issues");
    publish([["Paid orders", ["order/Paid"]]]);
    const out = (console.error(`DBG ${Date.now()} cli`), run(["--root", dir, "comparison", "new", "order"], dir, {})).out;
    expect(out).toContain("## Published issues\n\n- #126 Paid orders (Open): `order/Paid`");
    expect(out).toContain("names the issue (`#<n>`)");
    expect(out).toContain("first Fix option is to fix the code");
    const json = JSON.parse(run(["--root", dir, "comparison", "new", "order", "--json"], dir, {}).out);
    expect(json.publishedIssues).toEqual([{ number: 126, title: "Paid orders", status: "Open", refs: ["order/Paid"] }]);
  });
});

describe("where the editor says the published issues are", () => {
  const SKIPPED = process.platform === "win32";
  const window = async (onIssueStates?: () => readonly IssueStateRead[] | Promise<readonly IssueStateRead[]>, ownsTerminal?: (terminal: string, root: string) => boolean) => {
    const created = await createQuestionServer({ project: p, runtimeDir, handler: async () => unavailableQuestions(), onIssueStates, ownsTerminal });
    servers.push(created);
    return created;
  };
  const env = (server: QuestionServer) => ({ [QUESTION_ENDPOINT_ENV]: server.endpoint, TRAMA_TERMINAL: "abc123" });
  const states = [{ number: 126, status: "Closed" }];

  test.skipIf(SKIPPED)("an agent started by Trama gets the states the editor holds, and `comparison new` says them in the briefing", async () => {
    publish([["Paid orders", ["order/Paid"]]]);
    const server = await window(() => states);
    expect(await askIssueStates(p, { env: env(server), runtimeDir })).toEqual(states);
    const out = (await execute(["--root", dir, "comparison", "new", "order"], dir, { env: env(server), runtimeDir, stdin: async () => "" })).out;
    expect(out).toContain("- #126 Paid orders (Closed): `order/Paid`");
  });

  test.skipIf(SKIPPED)("a terminal the window does not own, a window with no handler or one that fails gets none, and the briefing says the state of publication", async () => {
    publish([["Paid orders", ["order/Paid"]]]);
    const strange = await window(() => states, () => false);
    expect(await askIssueStates(p, { env: env(strange), runtimeDir })).toEqual([]);
    const silent = await window();
    expect(await askIssueStates(p, { env: env(silent), runtimeDir })).toEqual([]);
    const broken = await window(() => Promise.reject(new Error("boom")));
    expect(await askIssueStates(p, { env: env(broken), runtimeDir })).toEqual([]);
    const out = (await execute(["--root", dir, "comparison", "new", "order"], dir, { env: env(broken), runtimeDir, stdin: async () => "" })).out;
    expect(out).toContain("- #126 Paid orders (Open)");
  });

  test("without the endpoint and a terminal, or with an editor that stays silent, there is no answer and nothing waits", async () => {
    expect(await askIssueStates(p, { env: {}, runtimeDir })).toBeNull();
    expect(await askIssueStates(p, { env: { [QUESTION_ENDPOINT_ENV]: join(runtimeDir, "gone.sock"), TRAMA_TERMINAL: "abc123" }, runtimeDir })).toBeNull();
    if (SKIPPED) return;
    const silent = await window(() => new Promise<readonly IssueStateRead[]>(() => {}));
    expect(await askIssueStates(p, { env: env(silent), runtimeDir, timeoutMs: 300 })).toBeNull();
  });
});

describe("the published issues of the project", () => {
  test("are the published cards with a number: its number, when it was published and the estimate of its card", () => {
    publish([["Paid orders", ["order/Paid"]]]);
    const [only] = publishedIssues(p);
    expect(only).toMatchObject({ number: 126, estimate: 1 });
    expect(typeof only?.published).toBe("string");
    expect(teamViews(p).issues[0]?.published).toBe(only?.published ?? null);
  });
});
