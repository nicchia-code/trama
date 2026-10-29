import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { execute } from "../src/cli/main";
import {
  currentIteration,
  findGh,
  GH_ACCESS_ARGS,
  GH_LOGIN_ARGS,
  GH_NOT_INSTALLED,
  GH_NOT_LOGGED_IN,
  type GhOutcome,
  type GhRunner,
  ghProblemKind,
  ghProblemMessage,
  ghSearchFolders,
  githubProjectFile,
  iterationEnd,
  linkedGithubProject,
  linkGithubProject,
  localToday,
  offeredIterations,
  type ProjectChoice,
  PROJECT_ITEMS_QUERY,
  PROJECT_QUERY,
  PROJECTS_QUERY,
  readPullRequests,
  readGitHub,
  readLinkedProject,
  sprintField,
  unlinkGithubProject,
} from "../src/core/github";
import { setManagerMode } from "../src/core/manager-mode";
import { projectAt } from "../src/core/store";

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-github-"));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

const ok = (stdout: string): GhOutcome => ({ status: 0, stdout, stderr: "", failed: null });
const refused = (status: number, stderr: string, stdout = ""): GhOutcome => ({ status, stdout, stderr, failed: null });

const PROJECTS_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      login: "acme",
      projectsV2: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          { number: 1, title: "Roadmap", closed: false, fields: { nodes: [{ name: "Title", dataType: "TITLE" }, { name: "Estimate", dataType: "NUMBER" }, { name: "Sprint", dataType: "ITERATION" }, { name: "Priority", dataType: "SINGLE_SELECT" }, {}] } },
          { number: 2, title: "Bug triage", closed: false, fields: { nodes: [{ name: "Priority", dataType: "SINGLE_SELECT" }] } },
          { number: 3, title: "Old", closed: true, fields: { nodes: [{ name: "Sprint", dataType: "ITERATION" }] } },
        ],
      },
    },
    repository: { projectsV2: { nodes: [{ number: 1 }] } },
  },
});

const PROJECT_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      projectV2: {
        number: 1,
        title: "Roadmap",
        fields: {
          nodes: [
            { id: "F1", name: "Title", dataType: "TITLE" },
            { id: "F2", name: "Status", dataType: "SINGLE_SELECT", options: [{ id: "O1", name: "Todo" }, { id: "O2", name: "Done" }] },
            { id: "F3", name: "Sprint", dataType: "ITERATION", configuration: { iterations: [{ id: "I2", title: "Sprint 2", startDate: "2026-10-26", duration: 7 }], completedIterations: [{ id: "I1", title: "Sprint 1", startDate: "2026-10-19", duration: 7 }] } },
            { id: "F4", name: "Other", dataType: "ITERATION", configuration: { iterations: [{ id: "X", title: "Other 1", startDate: "2026-01-01", duration: 14 }] } },
            { id: "F5", name: "Estimate (days)", dataType: "NUMBER" },
          ],
        },
      },
    },
  },
});

const issueNode = (number: number, over: Record<string, unknown> = {}, values: unknown[] = []) => ({
  content: { number, title: `Issue ${number}`, state: "OPEN", stateReason: null, repository: { nameWithOwner: "Acme/Web" }, assignees: { nodes: [{ login: "giulia" }] }, closedByPullRequestsReferences: { nodes: [] }, linkedBranches: { nodes: [] }, ...over },
  fieldValues: { nodes: values },
});
const named = (name: string) => ({ field: { name } });

const ITEMS_ANSWER = JSON.stringify({
  data: {
    repositoryOwner: {
      projectV2: {
        items: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            issueNode(126, { state: "CLOSED", stateReason: "COMPLETED" }, [{ title: "Sprint 12", ...named("Sprint") }, { number: 2, ...named("Estimate (days)") }, { name: "Done", ...named("Status") }, { text: "note", ...named("Notes") }, { date: "2026-10-30", ...named("Due") }, {}]),
            issueNode(128, { closedByPullRequestsReferences: { nodes: [{ state: "OPEN", isDraft: true }, { state: "MERGED", isDraft: false }] }, linkedBranches: { nodes: [{ ref: { name: "128-address" } }, {}] }, assignees: { nodes: [] } }),
            issueNode(7, { repository: { nameWithOwner: "acme/other" } }),
            { content: { title: "A draft issue" }, fieldValues: { nodes: [] } },
            { content: {}, fieldValues: { nodes: [] } },
            { content: null, fieldValues: { nodes: [] } },
          ],
        },
      },
    },
  },
});

/** A runner that records every call and answers like `gh` does. */
function fakeGh(overrides: { version?: GhOutcome; auth?: GhOutcome; projects?: GhOutcome; project?: GhOutcome; items?: GhOutcome | GhOutcome[] } = {}) {
  const calls: string[][] = [];
  const run: GhRunner = async (_program, args) => {
    calls.push([...args]);
    if (args[0] === "--version") return overrides.version ?? ok("gh version 2.60.0\n");
    if (args[0] === "auth") return overrides.auth ?? ok("Logged in to github.com\n");
    const query = args.find((arg) => arg.startsWith("query=")) ?? "";
    if (query.includes("repository(owner")) return overrides.projects ?? ok(PROJECTS_ANSWER);
    if (query.includes("items(first: 100")) return (Array.isArray(overrides.items) ? overrides.items[calls.filter((call) => call.some((arg) => arg.includes("items(first: 100"))).length - 1] : overrides.items) ?? ok(ITEMS_ANSWER);
    return overrides.project ?? ok(PROJECT_ANSWER);
  };
  return { calls, deps: { find: () => "/usr/bin/gh", run, now: () => new Date("2026-10-25T10:00:00Z") } };
}

describe("where gh is looked for", () => {
  test("the editor's PATH first, then /opt/homebrew/bin and /usr/local/bin", () => {
    expect(ghSearchFolders({ PATH: "/a:/b" }, "linux")).toEqual(["/a", "/b", "/opt/homebrew/bin", "/usr/local/bin"]);
  });

  test("on Windows also %ProgramFiles%\\GitHub CLI", () => {
    const folders = ghSearchFolders({ Path: "C:\\x;C:\\y", ProgramFiles: "C:\\Program Files" }, "win32");
    expect(folders.slice(0, 2)).toEqual(["C:\\x", "C:\\y"]);
    expect(folders.at(-1)).toBe("C:\\Program Files\\GitHub CLI");
  });

  test("the first folder that holds a file named gh wins, and none is null", () => {
    const gh = process.platform === "win32" ? "gh.exe" : "gh";
    mkdirSync(join(base, "one"));
    mkdirSync(join(base, "two"));
    writeFileSync(join(base, "two", gh), "");
    expect(findGh({ PATH: `${join(base, "one")}${delimiter}${join(base, "two")}` })).toBe(join(base, "two", gh));
    // The fixed folders may hold a real gh on this machine: only the PATH part is asserted.
    expect(findGh({ PATH: join(base, "one") })).not.toBe(join(base, "one", gh));
  });
});

describe("a read of GitHub", () => {
  test("runs only gh --version, gh auth status and gh api graphql, in that order, with fixed arguments", async () => {
    const { calls, deps } = fakeGh();
    const reading = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, deps);
    expect(reading.ok).toBe(true);
    expect(calls.map((args) => args.slice(0, 2))).toEqual([["--version"], ["auth", "status"], ["api", "graphql"], ["api", "graphql"], ["api", "graphql"]]);
    expect(calls[1]).toEqual(["auth", "status", "--hostname", "github.com"]);
    for (const args of calls.filter((call) => call[0] === "api")) {
      expect(args.slice(0, 4)).toEqual(["api", "graphql", "--hostname", "github.com"]);
      const query = args.find((arg) => arg.startsWith("query=")) ?? "";
      expect(query).not.toMatch(/\bmutation\b/);
    }
  });

  test("the Projects of the owner: open ones, the ones linked to the repository, the iteration field and the fields Trama uses", async () => {
    const reading = await readGitHub("acme/web", null, fakeGh().deps);
    if (!reading.ok) throw new Error(reading.reason);
    expect(reading.readAt).toBe("2026-10-25T10:00:00.000Z");
    expect(reading.project).toBeNull();
    expect(reading.projects).toEqual([
      { owner: "acme", number: 1, title: "Roadmap", repository: true, iteration: true, fields: ["Sprint", "Estimate", "Priority"] },
      { owner: "acme", number: 2, title: "Bug triage", repository: false, iteration: false, fields: ["Priority"] },
    ]);
  });

  test("the fields of the linked Project with their options, and the iterations of the first iteration field, oldest first", async () => {
    const reading = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, fakeGh().deps);
    if (!reading.ok || reading.project === null) throw new Error("not read");
    expect(reading.project.fields.map((field) => field.name)).toEqual(["Title", "Status", "Sprint", "Other", "Estimate (days)"]);
    expect(reading.project.fields[1]?.options).toEqual([{ id: "O1", name: "Todo" }, { id: "O2", name: "Done" }]);
    expect(sprintField(reading.project.fields)?.name).toBe("Sprint");
    expect(reading.project.iterations.map((iteration) => iteration.title)).toEqual(["Sprint 1", "Sprint 2"]);
  });

  test("the items of the linked Project that are issues of the repository: state, assignees, field values, pull requests and branches; the rest is left out", async () => {
    const reading = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, fakeGh().deps);
    if (!reading.ok || reading.project === null) throw new Error("not read");
    expect(reading.project.items).toEqual([
      {
        number: 126,
        title: "Issue 126",
        state: "CLOSED",
        stateReason: "COMPLETED",
        assignees: ["giulia"],
        values: { Sprint: "Sprint 12", "Estimate (days)": 2, Status: "Done", Notes: "note", Due: "2026-10-30" },
        pullRequests: [],
        branches: [],
      },
      {
        number: 128,
        title: "Issue 128",
        state: "OPEN",
        stateReason: null,
        assignees: [],
        values: {},
        pullRequests: [{ state: "OPEN", draft: true }, { state: "MERGED", draft: false }],
        branches: ["128-address"],
      },
    ]);
  });

  test("the items query is constant, read-only, a hundred at a time, and its pages are followed with the cursor", async () => {
    expect(PROJECT_ITEMS_QUERY).not.toMatch(/\bmutation\b/);
    expect(PROJECT_ITEMS_QUERY).toContain("items(first: 100, after: $cursor)");
    const page = (number: number, next: string | null) => JSON.stringify({ data: { repositoryOwner: { projectV2: { items: { pageInfo: { hasNextPage: next !== null, endCursor: next }, nodes: [issueNode(number)] } } } } });
    const { calls, deps } = fakeGh({ items: [ok(page(1, "C1")), ok(page(2, null))] });
    const reading = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, deps);
    if (!reading.ok || reading.project === null) throw new Error("not read");
    expect(reading.project.items.map((i) => i.number)).toEqual([1, 2]);
    const itemCalls = calls.filter((call) => call.some((arg) => arg.includes("items(first: 100")));
    expect(itemCalls.map((call) => call.find((arg) => arg.startsWith("cursor=")))).toEqual([undefined, "cursor=C1"]);
  });

  test("a failed read of the items is a read error and keeps nothing of the Project", async () => {
    const reading = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, fakeGh({ items: refused(1, "HTTP 502: Bad Gateway\n") }).deps);
    expect(reading).toMatchObject({ ok: false, reason: "gh exited with code 1: HTTP 502: Bad Gateway" });
    const gone = await readGitHub("acme/web", { owner: "acme", number: 1, title: "Roadmap" }, fakeGh({ items: ok(JSON.stringify({ data: { repositoryOwner: { projectV2: null } } })) }).deps);
    expect(gone).toMatchObject({ ok: false, reason: "GitHub has no Project acme#1" });
  });

  test("pages are followed until the last one", async () => {
    const pages = [
      JSON.stringify({ data: { repositoryOwner: { login: "acme", projectsV2: { pageInfo: { hasNextPage: true, endCursor: "C1" }, nodes: [{ number: 1, title: "A", fields: { nodes: [] } }] } }, repository: null } }),
      JSON.stringify({ data: { repositoryOwner: { login: "acme", projectsV2: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 2, title: "B", fields: { nodes: [] } }] } }, repository: null } }),
    ];
    const cursors: (string | undefined)[] = [];
    const deps = {
      find: () => "gh",
      run: async (_program: string, args: readonly string[]): Promise<GhOutcome> => {
        if (args[0] === "--version" || args[0] === "auth") return ok("");
        cursors.push(args.find((arg) => arg.startsWith("cursor=")));
        return ok(pages[cursors.length - 1] ?? "");
      },
    };
    const reading = await readGitHub("acme/web", null, deps);
    if (!reading.ok) throw new Error(reading.reason);
    expect(reading.projects.map((project) => project.title)).toEqual(["A", "B"]);
    expect(cursors).toEqual([undefined, "cursor=C1"]);
  });

  test("gh not found is not installed, and no gh call runs", async () => {
    const calls: string[][] = [];
    const reading = await readGitHub("acme/web", null, { find: () => null, run: async (_p, args) => (calls.push([...args]), ok("")) });
    expect(reading).toMatchObject({ ok: false, reason: GH_NOT_INSTALLED });
    expect(calls).toEqual([]);
  });

  test("a gh that cannot start is not installed", async () => {
    const reading = await readGitHub("acme/web", null, { find: () => "gh", run: async () => ({ status: null, stdout: "", stderr: "", failed: GH_NOT_INSTALLED }) });
    expect(reading).toMatchObject({ ok: false, reason: GH_NOT_INSTALLED });
  });

  test("a failed gh auth status is not logged in, and nothing else runs", async () => {
    const { calls, deps } = fakeGh({ auth: refused(1, "You are not logged into any GitHub hosts.\n") });
    const reading = await readGitHub("acme/web", null, deps);
    expect(reading).toMatchObject({ ok: false, reason: GH_NOT_LOGGED_IN });
    expect(calls).toHaveLength(2);
  });

  test("a Projects query refused for the missing scope is cannot read Projects", async () => {
    const reading = await readGitHub("acme/web", null, fakeGh({ projects: refused(1, "gh: Your token has not been granted the required scopes to execute this query. The 'projectsV2' field requires one of the following scopes: ['read:project'], but your token has only been granted the: ['repo'] scopes.\n") }).deps);
    if (reading.ok) throw new Error("read");
    expect(ghProblemKind(reading.reason)).toBe("no-project-access");
    expect(ghProblemMessage(reading.reason)).toContain("Give access");
  });

  test("any other failure says gh exited with its code and the first line of stderr", async () => {
    const reading = await readGitHub("acme/web", null, fakeGh({ projects: refused(1, "\nHTTP 502: Bad Gateway (https://api.github.com/graphql)\nsecond line\n") }).deps);
    if (reading.ok) throw new Error("read");
    expect(reading.reason).toBe("gh exited with code 1: HTTP 502: Bad Gateway (https://api.github.com/graphql)");
    expect(reading.details).toContain("second line");
    expect(ghProblemKind(reading.reason)).toBe("read-error");
  });

  test("a timeout and a GraphQL error on standard output are read errors", async () => {
    const timeout = await readGitHub("acme/web", null, fakeGh({ projects: { status: null, stdout: "", stderr: "", failed: "gh did not finish within 20 seconds" } }).deps);
    expect(timeout).toMatchObject({ ok: false, reason: "gh did not finish within 20 seconds" });
    const graphql = await readGitHub("acme/web", null, fakeGh({ projects: ok(JSON.stringify({ errors: [{ message: "Could not resolve to a User" }] })) }).deps);
    expect(graphql).toMatchObject({ ok: false, reason: "gh returned errors: Could not resolve to a User" });
    const notJson = await readGitHub("acme/web", null, fakeGh({ projects: ok("<html>") }).deps);
    expect(notJson).toMatchObject({ ok: false, reason: "gh answered something that is not JSON" });
  });

  test("an owner that GitHub does not know is a read error", async () => {
    const reading = await readGitHub("ghost/web", null, fakeGh({ projects: ok(JSON.stringify({ data: { repositoryOwner: null, repository: null } })) }).deps);
    expect(reading).toMatchObject({ ok: false, reason: "GitHub has no user or organisation named ghost" });
  });

  test("a linked Project GitHub does not return is a read error", async () => {
    const reading = await readGitHub("acme/web", { owner: "acme", number: 9, title: "Gone" }, fakeGh({ project: ok(JSON.stringify({ data: { repositoryOwner: { projectV2: null } } })) }).deps);
    expect(reading).toMatchObject({ ok: false, reason: "GitHub has no Project acme#9" });
  });

  test("the linked Project alone is read without the list of Projects", async () => {
    const { calls, deps } = fakeGh();
    const read = await readLinkedProject({ owner: "acme", number: 1, title: "Roadmap" }, deps);
    expect(read.ok).toBe(true);
    expect(calls.map((args) => args[0])).toEqual(["--version", "auth", "api"]);
    expect(calls[2]?.some((arg) => arg === "number=1")).toBe(true);
  });

  test("the messages of trama issue fields name the reason and how to fix it", () => {
    expect(ghProblemMessage(GH_NOT_INSTALLED)).toContain("https://cli.github.com");
    expect(ghProblemMessage(GH_NOT_LOGGED_IN)).toContain("Log in to GitHub");
    expect(ghProblemMessage("gh exited with code 1: boom")).toBe("Couldn't read the GitHub Project: gh exited with code 1: boom");
  });
});

describe("the read of the pull requests", () => {
  const node = (number: number, extra: Record<string, unknown> = {}) => ({ number, title: `Title ${number}`, author: { login: "ada" }, isDraft: false, baseRefName: "main", headRefName: `feature-${number}`, headRefOid: `${number}`.padStart(40, "a"), url: `https://github.com/acme/web/pull/${number}`, ...extra });

  function listGh(stdout: string, outcome: Partial<GhOutcome> = {}) {
    const calls: string[][] = [];
    const run: GhRunner = async (_program, args) => {
      calls.push([...args]);
      if (args[0] === "pr") return { ...ok(stdout), ...outcome };
      return args[0] === "--version" ? ok("gh version 2.60.0\n") : ok("Logged in\n");
    };
    return { calls, deps: { find: () => "/usr/bin/gh", run, now: () => new Date("2026-10-25T10:00:00Z") } };
  }

  test("asks for the open pull requests of the repository with fixed arguments and nothing else", async () => {
    const { calls, deps } = listGh("[]");
    await readPullRequests("acme/web", deps);
    expect(calls.at(-1)).toEqual(["pr", "list", "--repo", "acme/web", "--state", "open", "--limit", "100", "--json", "number,title,author,isDraft,baseRefName,headRefName,headRefOid,url"]);
    expect(calls.map((args) => args[0])).toEqual(["--version", "auth", "pr"]);
  });

  test("keeps the pull requests that are not drafts, the highest number first", async () => {
    const { deps } = listGh(JSON.stringify([node(3), node(9, { isDraft: true }), node(12), node(5, { author: null })]));
    const reading = await readPullRequests("acme/web", deps);
    expect(reading).toEqual({
      ok: true,
      readAt: "2026-10-25T10:00:00.000Z",
      items: [
        { number: 12, title: "Title 12", author: "ada", baseRefName: "main", headRefName: "feature-12", headRefOid: "12".padStart(40, "a"), url: "https://github.com/acme/web/pull/12" },
        { number: 5, title: "Title 5", author: "", baseRefName: "main", headRefName: "feature-5", headRefOid: "5".padStart(40, "a"), url: "https://github.com/acme/web/pull/5" },
        { number: 3, title: "Title 3", author: "ada", baseRefName: "main", headRefName: "feature-3", headRefOid: "3".padStart(40, "a"), url: "https://github.com/acme/web/pull/3" },
      ],
    });
  });

  test("an item that lacks a field is left out", async () => {
    const { deps } = listGh(JSON.stringify([node(1, { url: undefined }), node(2)]));
    const reading = await readPullRequests("acme/web", deps);
    expect(reading.ok && reading.items.map((item) => item.number)).toEqual([2]);
  });

  test("a failed call or an answer that is not a list is a failed read with the reason", async () => {
    const failed = await readPullRequests("acme/web", listGh("", { status: 1, stderr: "HTTP 502\nmore" }).deps);
    expect(failed).toMatchObject({ ok: false, reason: "gh exited with code 1: HTTP 502" });
    expect(await readPullRequests("acme/web", listGh("not json").deps)).toMatchObject({ ok: false });
    expect(await readPullRequests("acme/web", listGh("{}").deps)).toMatchObject({ ok: false });
  });

  test("gh not installed or not logged in stops before the list is asked", async () => {
    const calls: string[][] = [];
    const run: GhRunner = async (_program, args) => {
      calls.push([...args]);
      return args[0] === "auth" ? refused(1, "not logged in") : ok("gh version 2.60.0\n");
    };
    const reading = await readPullRequests("acme/web", { find: () => "/usr/bin/gh", run });
    expect(reading).toMatchObject({ ok: false, reason: GH_NOT_LOGGED_IN });
    expect(calls.some((args) => args[0] === "pr")).toBe(false);
    expect(await readPullRequests("acme/web", { find: () => null })).toMatchObject({ ok: false, reason: GH_NOT_INSTALLED });
  });

  test("a repository that is not owner/name never reaches gh", async () => {
    const { calls, deps } = listGh("[]");
    expect(await readPullRequests("--hostname=x", deps)).toMatchObject({ ok: false });
    expect(calls.some((args) => args[0] === "pr")).toBe(false);
  });
});

describe("the only gh commands", () => {
  const source = readFileSync(join(import.meta.dir, "..", "src", "core", "github.ts"), "utf8");

  test("the module contains no command that writes", () => {
    expect(source).not.toMatch(/\bmutation\b/);
    expect(source).not.toMatch(/"(?:create|edit|reopen|delete|comment|merge|transfer|item-add|item-create|item-edit|item-delete|item-archive|field-create|field-delete|link|unlink|copy|set|--method|-X|--input)"/);
    expect(source).not.toMatch(/\["(?:issue|project|repo|release|gist)"/);
    // The only `pr` command is the read of the open pull requests.
    expect([...source.matchAll(/\["pr",\s*"([a-z-]+)"/g)].map((found) => found[1])).toEqual(["list"]);
    expect(PROJECTS_QUERY).not.toMatch(/\bmutation\b/);
    expect(PROJECT_QUERY).not.toMatch(/\bmutation\b/);
  });

  test("it never starts a shell and only this module builds gh commands", () => {
    expect(source).not.toMatch(/shell:\s*true/);
    expect(source).not.toMatch(/\bexec(?:Sync)?\(/);
    expect(source).toContain('["--version"]');
  });

  test("the terminal commands log in and give access to Projects, nothing else", () => {
    expect([...GH_LOGIN_ARGS]).toEqual(["auth", "login", "--hostname", "github.com", "--web", "--scopes", "project"]);
    expect([...GH_ACCESS_ARGS]).toEqual(["auth", "refresh", "--hostname", "github.com", "--scopes", "project"]);
  });
});

describe("sprints", () => {
  const iterations = [
    { id: "1", title: "S1", startDate: "2026-10-12", duration: 7 },
    { id: "2", title: "S2", startDate: "2026-10-19", duration: 7 },
    { id: "3", title: "S3", startDate: "2026-10-26", duration: 7 },
  ];

  test("an iteration ends the day it is followed by the next", () => {
    expect(iterationEnd(iterations[1] as (typeof iterations)[number])).toBe("2026-10-26");
  });

  test("the current one contains today, first and last day included", () => {
    expect(currentIteration(iterations, "2026-10-19")?.id).toBe("2");
    expect(currentIteration(iterations, "2026-10-25")?.id).toBe("2");
    expect(currentIteration(iterations, "2026-10-26")?.id).toBe("3");
    expect(currentIteration(iterations, "2026-11-30")).toBeNull();
  });

  test("past iterations are not offered", () => {
    expect(offeredIterations(iterations, "2026-10-25").map((iteration) => iteration.id)).toEqual(["2", "3"]);
    expect(offeredIterations(iterations, "2026-12-01")).toEqual([]);
  });

  test("today is the local date", () => {
    expect(localToday(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
  });
});

describe("the link of the Project", () => {
  const choice: Pick<ProjectChoice, "owner" | "number" | "title" | "iteration"> = { owner: "acme", number: 1, title: "Roadmap", iteration: true };

  test("absent is not linked", () => {
    expect(linkedGithubProject(projectAt(base))).toBeNull();
  });

  test("linking writes .trama/manager/project.json and the .gitignore of the folder", () => {
    const p = projectAt(base);
    expect(linkGithubProject(p, choice)).toEqual({ owner: "acme", number: 1, title: "Roadmap" });
    expect(JSON.parse(readFileSync(githubProjectFile(p), "utf8"))).toEqual({ owner: "acme", number: 1, title: "Roadmap" });
    expect(readFileSync(join(p.dir, "manager", ".gitignore"), "utf8")).toBe("*\n");
    expect(linkedGithubProject(p)).toEqual({ owner: "acme", number: 1, title: "Roadmap" });
  });

  test("a Project without an iteration field is refused and nothing is written", () => {
    const p = projectAt(base);
    expect(() => linkGithubProject(p, { ...choice, iteration: false })).toThrow("No Iteration field");
    expect(existsSync(githubProjectFile(p))).toBe(false);
  });

  test("linking another Project replaces the file", () => {
    const p = projectAt(base);
    linkGithubProject(p, choice);
    linkGithubProject(p, { owner: "acme", number: 2, title: "Other", iteration: true });
    expect(linkedGithubProject(p)).toEqual({ owner: "acme", number: 2, title: "Other" });
  });

  test("a file that does not match is not linked and the next link replaces it", () => {
    const p = projectAt(base);
    mkdirSync(join(p.dir, "manager"), { recursive: true });
    for (const content of ["not json", "[]", "{}", '{"owner":"acme","number":0,"title":"x"}', '{"owner":"","number":1,"title":"x"}', '{"owner":"acme","number":1.5,"title":"x"}', '{"owner":"acme","number":1}']) {
      writeFileSync(githubProjectFile(p), content);
      expect(linkedGithubProject(p)).toBeNull();
    }
    linkGithubProject(p, choice);
    expect(linkedGithubProject(p)?.number).toBe(1);
  });

  test("unlinking deletes only the file and leaves Manager mode and the .gitignore", () => {
    const p = projectAt(base);
    mkdirSync(join(p.dir, "manager"), { recursive: true });
    writeFileSync(join(p.dir, "manager", "mode.json"), "{}\n");
    linkGithubProject(p, choice);
    unlinkGithubProject(p);
    expect(linkedGithubProject(p)).toBeNull();
    expect(existsSync(join(p.dir, "manager", "mode.json"))).toBe(true);
    expect(existsSync(join(p.dir, "manager", ".gitignore"))).toBe(true);
    expect(() => unlinkGithubProject(p)).not.toThrow();
  });
});

describe("trama issue fields", () => {
  const windows = process.platform === "win32";

  function team(): ReturnType<typeof projectAt> {
    for (const args of [["init", "-q"], ["remote", "add", "origin", "https://github.com/acme/web"]]) {
      const r = spawnSync("git", args, { cwd: base, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL" });
      if (r.status !== 0) throw new Error(r.stderr);
    }
    const p = projectAt(base);
    setManagerMode(p, true);
    return p;
  }

  /** A folder with a `gh` that answers like the real one, for a PATH. */
  function fakeBin(): string {
    const bin = join(base, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "answer.json"), PROJECT_ANSWER);
    writeFileSync(join(bin, "gh"), '#!/bin/sh\ncase "$1" in\n  --version) echo "gh version 2.60.0";;\n  auth) echo ok;;\n  api) cat "$(dirname "$0")/answer.json";;\nesac\n');
    chmodSync(join(bin, "gh"), 0o755);
    return bin;
  }

  test("fails when Team is not available", async () => {
    mkdirSync(join(base, ".trama"));
    await expect(execute(["--root", base, "issue", "fields"], base, { env: {} })).rejects.toThrow("Manager Mode is off in this working copy.");
  });

  test("fails without a linked Project", async () => {
    team();
    await expect(execute(["--root", base, "issue", "fields"], base, { env: {} })).rejects.toThrow("No GitHub Project is linked: link one in the Team view.");
  });

  test.skipIf(windows)("prints the fields and the iterations, marking the sprint field and the current sprint", async () => {
    const p = team();
    linkGithubProject(p, { owner: "acme", number: 1, title: "Roadmap", iteration: true });
    const bin = fakeBin();
    const env = { PATH: `${bin}:/usr/bin:/bin` };
    const json = JSON.parse((await execute(["--root", base, "--json", "issue", "fields"], base, { env })).out);
    expect(json.project).toEqual({ owner: "acme", number: 1, title: "Roadmap" });
    expect(json.fields.map((f: { name: string; sprint: boolean; estimate: boolean }) => [f.name, f.sprint, f.estimate])).toEqual([["Title", false, false], ["Status", false, false], ["Sprint", true, false], ["Other", false, false], ["Estimate (days)", false, true]]);
    expect(json.iterations.map((i: { title: string }) => i.title)).toEqual(["Sprint 1", "Sprint 2"]);
    const md = (await execute(["--root", base, "issue", "fields"], base, { env })).out;
    expect(md).toContain("- Sprint (ITERATION) — sprint field");
    expect(md).toContain("- Estimate (days) (NUMBER) — estimate field");
    expect(md).not.toContain("- Sprint (ITERATION) — estimate field");
    expect(md).toContain("- Status (SINGLE_SELECT): Todo, Done");
    expect(md).toContain("Sprint 1: 2026-10-19 to 2026-10-25 (7 days)");
  });

  test.skipIf(windows)("a gh that is not logged in fails with exit reason of the Team view", async () => {
    const p = team();
    linkGithubProject(p, { owner: "acme", number: 1, title: "Roadmap", iteration: true });
    const bin = join(base, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "gh"), '#!/bin/sh\ncase "$1" in\n  --version) echo "gh version 2.60.0";;\n  auth) echo "not logged in" >&2; exit 1;;\nesac\n');
    chmodSync(join(bin, "gh"), 0o755);
    await expect(execute(["--root", base, "issue", "fields"], base, { env: { PATH: `${bin}:/usr/bin:/bin` } })).rejects.toThrow("You're not logged in to GitHub");
  });
});
