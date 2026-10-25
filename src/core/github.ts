import { spawn } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { delimiter, join, win32 } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { type Project, readTextLf, writeFileEnsuringDir } from "./store";

/*
 * Trama's reads of GitHub (`rules#github-project`, `tech#handoff`). This is the only module that builds a `gh` command, and it only reads: it runs `gh --version`,
 * `gh auth status --hostname github.com` and `gh api graphql` with the constant queries below, with fixed arguments, without a shell and with a timeout of 20 seconds.
 * The two commands that log `gh` in (`GH_LOGIN_ARGS`, `GH_ACCESS_ARGS`) run in a visible terminal of the editor, not here; they write only gh's own credentials,
 * never anything on GitHub. Writing on GitHub (issues, Project fields) is the agent's work, with its own `gh`.
 */

/** The only host Trama reads. */
export const GITHUB_HOST = "github.com";

/** How long a `gh` call may take before Trama stops it. */
export const GH_TIMEOUT_MS = 20_000;

/** What `Log in to GitHub` runs in a terminal. */
export const GH_LOGIN_ARGS: readonly string[] = ["auth", "login", "--hostname", GITHUB_HOST, "--web", "--scopes", "project"];
/** What `Give access` runs in a terminal. */
export const GH_ACCESS_ARGS: readonly string[] = ["auth", "refresh", "--hostname", GITHUB_HOST, "--scopes", "project"];

/** The reasons of the states of `gh` that have a box of their own in the Team view. */
export const GH_NOT_INSTALLED = "GitHub CLI is not installed";
export const GH_NOT_LOGGED_IN = "You're not logged in to GitHub";
/** Said by `trama issue fields` and the Team view when no Project is linked. */
export const NO_PROJECT_LINKED = "No GitHub Project is linked: link one in the Team view.";

/** The states `gh` can be in, in the order Trama finds them (`rules#github-project`). */
export type GhProblemKind = "not-installed" | "not-logged-in" | "no-project-access" | "read-error";

/** A scope error names the token's scope: `read:project`, or `project` in a message about scopes. */
const isScopeError = (text: string): boolean => /\bread:project\b/.test(text) || (/\bscopes?\b/i.test(text) && /\bproject\b/i.test(text));

/** The state a stored reason stands for: the two fixed ones, then a refused Projects query, then any other failure. */
export function ghProblemKind(reason: string): GhProblemKind {
  if (reason === GH_NOT_INSTALLED) return "not-installed";
  if (reason === GH_NOT_LOGGED_IN) return "not-logged-in";
  return isScopeError(reason) ? "no-project-access" : "read-error";
}

/** What `trama issue fields` says for a failed read: the reason of the Team view and how to fix it. */
export function ghProblemMessage(reason: string): string {
  switch (ghProblemKind(reason)) {
    case "not-installed":
      return `${GH_NOT_INSTALLED}: install it from https://cli.github.com, then read again.`;
    case "not-logged-in":
      return `${GH_NOT_LOGGED_IN}: the Manager logs in with Log in to GitHub in the Team view.`;
    case "no-project-access":
      return `GitHub CLI can't read Projects: the Manager gives it access with Give access in the Team view. ${reason}`;
    default:
      return `Couldn't read the GitHub Project: ${reason}`;
  }
}

/** A failed read: the reason (`ghProblemKind` tells the state from it) and everything `gh` said, for the output channel. */
export interface GhProblem {
  reason: string;
  details: string;
}

// ---- where gh is -----------------------------------------------------------

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** The folders `gh` is looked for in, in order: the editor's `PATH`, `/opt/homebrew/bin`, `/usr/local/bin` and, on Windows, `%ProgramFiles%\GitHub CLI`. */
export function ghSearchFolders(env: Record<string, string | undefined>, platform: NodeJS.Platform = process.platform): string[] {
  const windows = platform === "win32";
  const path = env["PATH"] ?? env["Path"] ?? "";
  const folders = path.split(windows ? ";" : delimiter).filter((folder) => folder !== "");
  folders.push("/opt/homebrew/bin", "/usr/local/bin");
  const programFiles = env["ProgramFiles"];
  if (windows && programFiles !== undefined && programFiles !== "") folders.push(win32.join(programFiles, "GitHub CLI"));
  return folders;
}

/** The `gh` program: the first file named `gh` (`gh.exe` on Windows) in `ghSearchFolders`, or null when there is none. There is no setting for it. */
export function findGh(env: Record<string, string | undefined> = process.env, platform: NodeJS.Platform = process.platform): string | null {
  const windows = platform === "win32";
  for (const folder of ghSearchFolders(env, platform)) {
    const file = windows ? win32.join(folder, "gh.exe") : join(folder, "gh");
    if (isFile(file)) return file;
  }
  return null;
}

// ---- running gh ------------------------------------------------------------

/** How a `gh` call ended: `failed` says why it did not run to its end (it could not start, or ran past the timeout). */
export interface GhOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
  failed: string | null;
}

/** Runs a program with arguments and no shell; injected by tests. */
export type GhRunner = (program: string, args: readonly string[]) => Promise<GhOutcome>;

/** The default runner: `spawn` without a shell, nothing on standard input, `SIGKILL` at the timeout. gh never prompts and talks only to github.com. */
export const runGh: GhRunner = (program, args) => {
  const { promise, resolve } = Promise.withResolvers<GhOutcome>();
  const child = spawn(program, [...args], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, env: { ...process.env, GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", GH_SPINNER_DISABLED: "1", NO_COLOR: "1" } });
  const out: Buffer[] = [];
  const err: Buffer[] = [];
  let timedOut = false;
  let failed: string | null = null;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, GH_TIMEOUT_MS);
  child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
  child.on("error", (error: NodeJS.ErrnoException) => {
    failed = error.code === "ENOENT" ? GH_NOT_INSTALLED : `Could not run gh: ${error.message}`;
    clearTimeout(timer);
    resolve({ status: null, stdout: "", stderr: "", failed });
  });
  child.on("close", (status) => {
    clearTimeout(timer);
    if (failed !== null) return;
    resolve({ status, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8"), failed: timedOut ? `gh did not finish within ${GH_TIMEOUT_MS / 1000} seconds` : null });
  });
  return promise;
};

const record = (value: unknown): Record<string, unknown> | undefined => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const firstLine = (text: string): string => text.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";

/** The first message of the `errors` of a GraphQL answer, when `gh` printed the answer on standard output. */
function graphqlMessage(stdout: string): string {
  try {
    const first = record(list(record(JSON.parse(stdout))?.["errors"])[0]);
    return typeof first?.["message"] === "string" ? firstLine(first["message"]) : "";
  } catch {
    return "";
  }
}

/** The failure of a call that did not succeed: `gh exited with code <n>: <first line of stderr>`, or why `gh` did not run. */
function failure(outcome: GhOutcome): GhProblem {
  const details = [outcome.stderr.trim(), outcome.stdout.trim()].filter((part) => part !== "").join("\n");
  if (outcome.failed !== null) return { reason: outcome.failed, details: outcome.failed };
  const said = firstLine(outcome.stderr) || graphqlMessage(outcome.stdout) || "no message";
  return { reason: `gh exited with code ${outcome.status}: ${said}`, details: details === "" ? `gh exited with code ${outcome.status}` : details };
}

// ---- the queries -----------------------------------------------------------

/** What the Projects query asks of each Project: enough to offer it and to say whether it has an iteration field. */
const PROJECTS_PAGE = `fragment ProjectsPage on ProjectV2Connection {
  pageInfo { hasNextPage endCursor }
  nodes { number title closed fields(first: 50) { nodes { ... on ProjectV2FieldCommon { name dataType } } } }
}`;

/** The Projects of the owner of the repository (a user or an organisation), and which of them are linked to the repository. */
export const PROJECTS_QUERY = `query($login: String!, $name: String!, $cursor: String) {
  repositoryOwner(login: $login) {
    login
    ... on User { projectsV2(first: 50, after: $cursor) { ...ProjectsPage } }
    ... on Organization { projectsV2(first: 50, after: $cursor) { ...ProjectsPage } }
  }
  repository(owner: $login, name: $name) { projectsV2(first: 100) { nodes { number } } }
}
${PROJECTS_PAGE}`;

const FIELD_PARTS = `fragment ProjectFields on ProjectV2 {
  number
  title
  url
  fields(first: 100) {
    nodes {
      ... on ProjectV2Field { id name dataType }
      ... on ProjectV2IterationField { id name dataType configuration { iterations { id title startDate duration } completedIterations { id title startDate duration } } }
      ... on ProjectV2SingleSelectField { id name dataType options { id name } }
    }
  }
}`;

/** The fields, with their options, and the iterations of one Project of the owner. */
export const PROJECT_QUERY = `query($login: String!, $number: Int!) {
  repositoryOwner(login: $login) {
    ... on User { projectV2(number: $number) { ...ProjectFields } }
    ... on Organization { projectV2(number: $number) { ...ProjectFields } }
  }
}
${FIELD_PARTS}`;

/**
 * The items of the linked Project that are issues (`rules#issue/Published`): number, title, state and reason, assignees, the value of every field, the pull requests that
 * close the issue with their state and draft flag, and the linked branches. Read-only, 100 items a page; `repository` of an item says which repository its issue is in.
 */
export const PROJECT_ITEMS_QUERY = `query($login: String!, $number: Int!, $cursor: String) {
  repositoryOwner(login: $login) {
    ... on User { projectV2(number: $number) { ...ProjectItems } }
    ... on Organization { projectV2(number: $number) { ...ProjectItems } }
  }
}
fragment ItemField on ProjectV2FieldConfiguration { ... on ProjectV2FieldCommon { name } }
fragment ProjectItems on ProjectV2 {
  items(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      content {
        ... on Issue {
          number
          title
          state
          stateReason
          repository { nameWithOwner }
          assignees(first: 20) { nodes { login } }
          closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { state isDraft } }
          linkedBranches(first: 20) { nodes { ref { name } } }
        }
      }
      fieldValues(first: 50) {
        nodes {
          ... on ProjectV2ItemFieldTextValue { text field { ...ItemField } }
          ... on ProjectV2ItemFieldNumberValue { number field { ...ItemField } }
          ... on ProjectV2ItemFieldSingleSelectValue { name field { ...ItemField } }
          ... on ProjectV2ItemFieldIterationValue { title field { ...ItemField } }
          ... on ProjectV2ItemFieldDateValue { date field { ...ItemField } }
        }
      }
    }
  }
}`;

// ---- what is read ----------------------------------------------------------

/** A field of a Project: `type` is GitHub's data type (`ITERATION`, `SINGLE_SELECT`, `NUMBER`, `TEXT`, `DATE`, …). */
export interface GitHubField {
  id: string;
  name: string;
  type: string;
  options?: { id: string; name: string }[];
}

/** An iteration of the sprint field: `startDate` is `YYYY-MM-DD`, `duration` is in days. */
export interface GitHubIteration {
  id: string;
  title: string;
  startDate: string;
  duration: number;
}

/** The fields and iterations of the linked Project (`data#github-project`); `url` is the address of its page, absent in a read made before Trama asked for it. */
export interface ProjectFields {
  fields: GitHubField[];
  iterations: GitHubIteration[];
  url?: string;
}

/** An issue of the repository that is an item of the linked Project, as the last read found it (`rules#issue/Published`). */
export interface GitHubItem {
  number: number;
  title: string;
  /** GitHub's own `OPEN` or `CLOSED`. */
  state: string;
  /** `COMPLETED`, `NOT_PLANNED`, `REOPENED` or null. */
  stateReason: string | null;
  /** The logins of the assignees. */
  assignees: string[];
  /** The value of each field the item has, by the name of the field: a single-select's option, an iteration's title, a number, a text or a date. */
  values: Record<string, string | number>;
  /** The pull requests that close the issue: their state (`OPEN`, `CLOSED` or `MERGED`) and whether they are drafts. */
  pullRequests: { state: string; draft: boolean }[];
  /** The names of the branches linked to the issue. */
  branches: string[];
}

/** What Trama reads of the linked Project (`data#github-project`). */
export interface GitHubProject extends ProjectFields {
  items: GitHubItem[];
}

/** A Project of the owner of the repository, as the picker offers it. */
export interface ProjectChoice {
  owner: string;
  number: number;
  title: string;
  /** Whether the Project is linked to the repository itself (`<owner>/<repo> · <title>` in the picker). */
  repository: boolean;
  /** Whether it has at least one iteration field: only such a Project is linked. */
  iteration: boolean;
  /** The names of the fields Trama will use, the iteration field first. */
  fields: string[];
}

/** The outcome of one read. */
export type GitHubReading = { ok: true; readAt: string; projects: ProjectChoice[]; project: GitHubProject | null } | ({ ok: false } & GhProblem);

/** The Project linked to the working copy (`data#github-project`). */
export interface LinkedProject {
  owner: string;
  number: number;
  title: string;
}

/** The data types of the fields a Project has of its own, which Trama never proposes. */
const OWN_FIELD_TYPES = new Set(["TITLE", "ASSIGNEES", "LABELS", "LINKED_PULL_REQUESTS", "MILESTONE", "REPOSITORY", "REVIEWERS", "PARENT_ISSUE", "SUB_ISSUES_PROGRESS", "TRACKS", "TRACKED_BY"]);

function choiceOf(node: unknown, owner: string, linkedToRepository: ReadonlySet<number>): ProjectChoice | undefined {
  const project = record(node);
  if (project === undefined || project["closed"] === true) return undefined;
  const { number, title } = project;
  if (typeof number !== "number" || typeof title !== "string") return undefined;
  const fields = list(record(project["fields"])?.["nodes"]).flatMap((field) => {
    const f = record(field);
    return f !== undefined && typeof f["name"] === "string" && typeof f["dataType"] === "string" ? [{ name: f["name"], type: f["dataType"] }] : [];
  });
  const used = fields.filter((field) => !OWN_FIELD_TYPES.has(field.type));
  const iteration = used.some((field) => field.type === "ITERATION");
  const names = [...used.filter((field) => field.type === "ITERATION"), ...used.filter((field) => field.type !== "ITERATION")].map((field) => field.name);
  return { owner, number, title, repository: linkedToRepository.has(number), iteration, fields: names };
}

/** The `data` of a GraphQL answer, or why `gh`'s answer is not usable. */
function parseAnswer(stdout: string): { data: Record<string, unknown> } | { problem: GhProblem } {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return { problem: { reason: "gh answered something that is not JSON", details: stdout.trim() } };
  }
  const answer = record(value);
  const data = record(answer?.["data"]);
  if (data !== undefined) return { data };
  const message = list(answer?.["errors"]).length > 0 ? graphqlMessage(stdout) || "no message" : "no data";
  return { problem: { reason: `gh returned errors: ${message}`, details: stdout.trim() } };
}

/** Hands the arguments of a GraphQL call: the query constant and variables that are text (`-f`) or whole numbers Trama checked (`-F`). */
function graphqlArgs(query: string, text: Record<string, string>, numbers: Record<string, number> = {}): string[] {
  return ["api", "graphql", "--hostname", GITHUB_HOST, "-f", `query=${query}`, ...Object.entries(text).flatMap(([name, value]) => ["-f", `${name}=${value}`]), ...Object.entries(numbers).flatMap(([name, value]) => ["-F", `${name}=${Math.trunc(value)}`])];
}

const MAX_PAGES = 10;

async function readProjects(run: (args: string[]) => Promise<GhOutcome>, repository: string): Promise<ProjectChoice[] | GhProblem> {
  const [ownerName = "", name = ""] = repository.split("/");
  const choices: ProjectChoice[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const outcome = await run(graphqlArgs(PROJECTS_QUERY, { login: ownerName, name, ...(cursor === undefined ? {} : { cursor }) }));
    if (outcome.failed !== null || outcome.status !== 0) return failure(outcome);
    const answer = parseAnswer(outcome.stdout);
    if ("problem" in answer) return answer.problem;
    const { data } = answer;
    const owner = record(data["repositoryOwner"]);
    if (owner === undefined) return { reason: `GitHub has no user or organisation named ${ownerName}`, details: outcome.stdout.trim() };
    const login = typeof owner["login"] === "string" ? owner["login"] : ownerName;
    const linkedToRepository = new Set(
      list(record(record(data["repository"])?.["projectsV2"])?.["nodes"]).flatMap((node) => {
        const n = record(node)?.["number"];
        return typeof n === "number" ? [n] : [];
      }),
    );
    const connection = record(owner["projectsV2"]);
    for (const node of list(connection?.["nodes"])) {
      const choice = choiceOf(node, login, linkedToRepository);
      if (choice !== undefined) choices.push(choice);
    }
    const info = record(connection?.["pageInfo"]);
    if (info?.["hasNextPage"] !== true || typeof info["endCursor"] !== "string") break;
    cursor = info["endCursor"];
  }
  return choices;
}

function iterationOf(node: unknown): GitHubIteration | undefined {
  const i = record(node);
  if (i === undefined) return undefined;
  const { id, title, startDate, duration } = i;
  return typeof id === "string" && typeof title === "string" && typeof startDate === "string" && typeof duration === "number" ? { id, title, startDate, duration } : undefined;
}

async function readProject(run: (args: string[]) => Promise<GhOutcome>, linked: LinkedProject): Promise<ProjectFields | GhProblem> {
  const outcome = await run(graphqlArgs(PROJECT_QUERY, { login: linked.owner }, { number: linked.number }));
  if (outcome.failed !== null || outcome.status !== 0) return failure(outcome);
  const answer = parseAnswer(outcome.stdout);
  if ("problem" in answer) return answer.problem;
  const project = record(record(answer.data["repositoryOwner"])?.["projectV2"]);
  if (project === undefined) return { reason: `GitHub has no Project ${linked.owner}#${linked.number}`, details: outcome.stdout.trim() };
  const fields: GitHubField[] = [];
  const iterations: GitHubIteration[] = [];
  let sprintRead = false;
  for (const node of list(record(project["fields"])?.["nodes"])) {
    const f = record(node);
    if (f === undefined || typeof f["id"] !== "string" || typeof f["name"] !== "string" || typeof f["dataType"] !== "string") continue;
    const field: GitHubField = { id: f["id"], name: f["name"], type: f["dataType"] };
    const options = list(f["options"]).flatMap((option) => {
      const o = record(option);
      return o !== undefined && typeof o["id"] === "string" && typeof o["name"] === "string" ? [{ id: o["id"], name: o["name"] }] : [];
    });
    if (f["options"] !== undefined) field.options = options;
    fields.push(field);
    // The sprint field is the first iteration field, in the Project's order.
    if (field.type === "ITERATION" && !sprintRead) {
      sprintRead = true;
      const configuration = record(f["configuration"]);
      for (const node of [...list(configuration?.["completedIterations"]), ...list(configuration?.["iterations"])]) {
        const iteration = iterationOf(node);
        if (iteration !== undefined) iterations.push(iteration);
      }
    }
  }
  iterations.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  const url = project["url"];
  return { fields, iterations, ...(typeof url === "string" && url !== "" ? { url } : {}) };
}

/** The text, number, name, title or date a field value of an item holds, with the name of its field. */
function itemValue(node: unknown): { name: string; value: string | number } | undefined {
  const v = record(node);
  const name = record(v?.["field"])?.["name"];
  if (v === undefined || typeof name !== "string") return undefined;
  for (const key of ["text", "number", "name", "title", "date"]) {
    const value = v[key];
    if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) return { name, value };
  }
  return undefined;
}

/** An item of the Project that is an issue of `repository` (case ignored), or nothing: draft issues, pull requests and issues of other repositories are not Trama's. */
function itemOf(node: unknown, repository: string): GitHubItem | undefined {
  const item = record(node);
  const content = record(item?.["content"]);
  const { number, title, state, stateReason } = content ?? {};
  if (item === undefined || content === undefined || typeof number !== "number" || typeof title !== "string" || typeof state !== "string") return undefined;
  const nameWithOwner = record(content["repository"])?.["nameWithOwner"];
  if (typeof nameWithOwner !== "string" || nameWithOwner.toLowerCase() !== repository.toLowerCase()) return undefined;
  const values: Record<string, string | number> = {};
  for (const node of list(record(item["fieldValues"])?.["nodes"])) {
    const value = itemValue(node);
    if (value !== undefined) values[value.name] = value.value;
  }
  const assignees = list(record(content["assignees"])?.["nodes"]).flatMap((n) => {
    const login = record(n)?.["login"];
    return typeof login === "string" ? [login] : [];
  });
  const pullRequests = list(record(content["closedByPullRequestsReferences"])?.["nodes"]).flatMap((n) => {
    const pr = record(n);
    return typeof pr?.["state"] === "string" ? [{ state: pr["state"], draft: pr["isDraft"] === true }] : [];
  });
  const branches = list(record(content["linkedBranches"])?.["nodes"]).flatMap((n) => {
    const name = record(record(n)?.["ref"])?.["name"];
    return typeof name === "string" ? [name] : [];
  });
  return { number, title, state, stateReason: typeof stateReason === "string" ? stateReason : null, assignees, values, pullRequests, branches };
}

/** A Project of a hundred thousand items is not a team's roadmap: past this many pages the rest is not read. */
const MAX_ITEM_PAGES = 50;

/** The items of the linked Project that are issues of the repository, a hundred at a time. */
async function readItems(run: (args: string[]) => Promise<GhOutcome>, linked: LinkedProject, repository: string): Promise<GitHubItem[] | GhProblem> {
  const items: GitHubItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_ITEM_PAGES; page++) {
    const outcome = await run(graphqlArgs(PROJECT_ITEMS_QUERY, { login: linked.owner, ...(cursor === undefined ? {} : { cursor }) }, { number: linked.number }));
    if (outcome.failed !== null || outcome.status !== 0) return failure(outcome);
    const answer = parseAnswer(outcome.stdout);
    if ("problem" in answer) return answer.problem;
    const connection = record(record(record(answer.data["repositoryOwner"])?.["projectV2"])?.["items"]);
    if (connection === undefined) return { reason: `GitHub has no Project ${linked.owner}#${linked.number}`, details: outcome.stdout.trim() };
    for (const node of list(connection["nodes"])) {
      const item = itemOf(node, repository);
      if (item !== undefined) items.push(item);
    }
    const info = record(connection["pageInfo"]);
    if (info?.["hasNextPage"] !== true || typeof info["endCursor"] !== "string") break;
    cursor = info["endCursor"];
  }
  return items;
}

/** Where the reads find `gh` and how they run it; tests replace both. */
export interface GhDeps {
  find?: () => string | null;
  run?: GhRunner;
  now?: () => Date;
}

/** A `gh` that runs and is logged in, or why not: the first two steps of every read, in the order `rules#github-project` gives. */
async function reachGh(deps: GhDeps): Promise<{ run: (args: string[]) => Promise<GhOutcome> } | { problem: GhProblem }> {
  const gh = (deps.find ?? findGh)();
  if (gh === null) return { problem: { reason: GH_NOT_INSTALLED, details: GH_NOT_INSTALLED } };
  const runner = deps.run ?? runGh;
  const run = (args: string[]): Promise<GhOutcome> => runner(gh, args);
  const version = await run(["--version"]);
  if (version.failed !== null || version.status !== 0) return { problem: version.failed === GH_NOT_INSTALLED ? { reason: GH_NOT_INSTALLED, details: GH_NOT_INSTALLED } : failure(version) };
  const auth = await run(["auth", "status", "--hostname", GITHUB_HOST]);
  if (auth.failed !== null) return { problem: failure(auth) };
  if (auth.status !== 0) return { problem: { reason: GH_NOT_LOGGED_IN, details: [auth.stderr.trim(), auth.stdout.trim()].filter((part) => part !== "").join("\n") || GH_NOT_LOGGED_IN } };
  return { run };
}

/**
 * One read of GitHub: `gh --version`, `gh auth status --hostname github.com`, the Projects of the owner of `repository` (`<owner>/<repo>`) and, with `linked`, the fields
 * and iterations of that Project. Stops at the first problem, in the order `rules#github-project` gives: not installed, not logged in, then a refused query (missing scope)
 * or any other failure.
 */
export async function readGitHub(repository: string, linked: LinkedProject | null, deps: GhDeps = {}): Promise<GitHubReading> {
  const reached = await reachGh(deps);
  if ("problem" in reached) return { ok: false, ...reached.problem };
  const projects = await readProjects(reached.run, repository);
  if (!Array.isArray(projects)) return { ok: false, ...projects };
  let project: GitHubProject | null = null;
  if (linked !== null) {
    const read = await readProject(reached.run, linked);
    if ("reason" in read) return { ok: false, ...read };
    const items = await readItems(reached.run, linked, repository);
    if (!Array.isArray(items)) return { ok: false, ...items };
    project = { ...read, items };
  }
  return { ok: true, readAt: (deps.now?.() ?? new Date()).toISOString(), projects, project };
}

/** The fields and iterations of the linked Project alone, for `trama issue fields`: the same steps as `readGitHub`, without the list of Projects. */
export async function readLinkedProject(linked: LinkedProject, deps: GhDeps = {}): Promise<{ ok: true; project: ProjectFields } | ({ ok: false } & GhProblem)> {
  const reached = await reachGh(deps);
  if ("problem" in reached) return { ok: false, ...reached.problem };
  const read = await readProject(reached.run, linked);
  return "reason" in read ? { ok: false, ...read } : { ok: true, project: read };
}

// ---- sprints ----------------------------------------------------------------

const DAY_MS = 86_400_000;

/** The date after the last day of an iteration (`YYYY-MM-DD`), which is the first day of the next one. */
export function iterationEnd(iteration: GitHubIteration): string {
  return new Date(Date.parse(`${iteration.startDate}T00:00:00Z`) + iteration.duration * DAY_MS).toISOString().slice(0, 10);
}

/** The sprint field of a Project: its first iteration field. */
export const sprintField = (fields: readonly GitHubField[]): GitHubField | undefined => fields.find((field) => field.type === "ITERATION");

/** The iteration that contains `today` (`YYYY-MM-DD`), or null. */
export const currentIteration = (iterations: readonly GitHubIteration[], today: string): GitHubIteration | null => iterations.find((iteration) => iteration.startDate <= today && today < iterationEnd(iteration)) ?? null;

/** The iterations a new issue can go to: the current one and the ones after it; past iterations are not offered. */
export const offeredIterations = (iterations: readonly GitHubIteration[], today: string): GitHubIteration[] => iterations.filter((iteration) => today < iterationEnd(iteration));

/** Today's date in the local time zone, as `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ---- the link ----------------------------------------------------------------

/** Where the linked Project is recorded: in the local folder of Manager mode (`data#github-project`), so it is never committed. */
export const githubProjectFile = (p: Project): string => join(p.dir, "manager", "project.json");

/** The GitHub Project linked to this working copy: `.trama/manager/project.json`; null when it is absent or does not match. */
export function linkedGithubProject(p: Project): LinkedProject | null {
  const file = githubProjectFile(p);
  if (!existsSync(file)) return null;
  try {
    const value = record(JSON.parse(readTextLf(file)));
    if (value === undefined) return null;
    const { owner, number, title } = value;
    return typeof owner === "string" && owner !== "" && typeof number === "number" && Number.isInteger(number) && number >= 1 && typeof title === "string" ? { owner, number, title } : null;
  } catch {
    return null;
  }
}

/**
 * Links a Project to the working copy (`developer.LINK_GITHUB_PROJECT`): writes `.trama/manager/project.json` and, when the folder has none, its `.gitignore`. Only a Project with an
 * iteration field is linked. Issues already published stay in the Project where they are. A failed write says why and changes nothing.
 */
export function linkGithubProject(p: Project, choice: Pick<ProjectChoice, "owner" | "number" | "title" | "iteration">): LinkedProject {
  if (!choice.iteration) throw new TramaError("No Iteration field — add one on GitHub to use it");
  const linked: LinkedProject = { owner: choice.owner, number: choice.number, title: choice.title };
  const file = githubProjectFile(p);
  try {
    const ignore = join(p.dir, "manager", ".gitignore");
    if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
    writeFileAtomic(file, `${JSON.stringify(linked)}\n`);
  } catch (error) {
    throw new TramaError(`Could not write ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return linked;
}

/** Unlinks the Project (`developer.UNLINK_GITHUB_PROJECT`): deletes only `.trama/manager/project.json`. Nothing changes on GitHub. */
export function unlinkGithubProject(p: Project): void {
  const file = githubProjectFile(p);
  try {
    rmSync(file, { force: true });
  } catch (error) {
    throw new TramaError(`Could not delete ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
