import { z } from "zod";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { diffEntries } from "./diff";
import { TramaError } from "./errors";
import { gitRunAsync } from "./git";
import type { PullRequest } from "./github";
import { normalizeLf } from "./line-endings";
import { listProposals, type Proposal, touchedFiles } from "./proposals";
import { buildProject } from "./requirements";
import { formatDiagnostic } from "./model";
import { projectSkillsFolder, readSoloMode } from "./solo-mode";
import { SPECS_FILE } from "./specs";
import { projectAt, type Project, readTextLf, REQUIREMENTS_PREFIX, TRAMA_DIR, writeFileEnsuringDir } from "./store";
import type { FileMap } from "./types";
import { driftSides, listDrifts, listTasks } from "./work";
import { readTimingRecords } from "./timings";

/*
 * The PR Check (`rules#pr-check`, `rules#pull-request-check`, `rules#pull-request-report`): the git work that prepares the worktree of a pull request, Trama's own checks of the
 * report, and the reports themselves. Every git call goes through `src/core/git.ts` with fixed arguments and no shell; nothing of the pull request is ever run. The repository is
 * read through its objects (`git show`, `git ls-tree`), never with a checkout: the only trace the PR Check leaves in the repository is the registration of its worktree.
 */

/** `git fetch` may talk to the network for a while; every other call has the helper's limit. */
export const FETCH_TIMEOUT_MS = 120_000;

/** How many `git show` run at once when a tree of Trama's files is read from the objects. */
const SHOW_POOL = 16;

/** A pull request number: a positive integer. */
export function checkedNumber(number: number): number {
  if (!Number.isSafeInteger(number) || number < 1) throw new TramaError(`${number} is not a pull request number`);
  return number;
}

/** A branch name as it reaches git: not empty, not starting with `-`, without what git refuses in a ref or a refspec. */
export function checkedBranch(name: string): string {
  if (name === "" || name.startsWith("-") || /[\s:?*[\\^~\x00-\x1f\x7f]/.test(name)) throw new TramaError(`"${name}" is not a usable branch name`);
  return name;
}

const firstLine = (text: string): string => text.split(/\r?\n/).find((line) => line.trim() !== "")?.trim() ?? "";

/** Runs git in `cwd` and returns its output, or throws with git's first line of error. */
async function gitOut(cwd: string, args: string[], timeoutMs?: number): Promise<string> {
  const result = await gitRunAsync(cwd, args, timeoutMs);
  if (!result.ok) throw new TramaError(firstLine(result.stderr) || firstLine(result.stdout) || `git ${args[0]} failed`);
  return result.stdout;
}

/** Runs `work` on every item, `size` at a time, and returns the answers in the order of the items. */
async function inPool<T, R>(items: readonly T[], work: (item: T) => Promise<R>, size = SHOW_POOL): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (let at = next++; at < items.length; at = next++) out[at] = await work(items[at] as T);
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

// ---- where the project is ---------------------------------------------------

/** Where the project sits in git: the top of the repository and the project's folder inside it (`""`, or `sub/` with the slash). */
export interface Place {
  top: string;
  prefix: string;
}

/** The place of the project root in its repository; refuses a folder outside a git working tree. */
export async function placeOf(root: string): Promise<Place> {
  const top = (await gitOut(root, ["rev-parse", "--show-toplevel"])).replace(/\r?\n$/, "");
  const prefix = (await gitOut(root, ["rev-parse", "--show-prefix"])).replace(/\r?\n$/, "");
  return { top, prefix };
}

// ---- the way it works -------------------------------------------------------

/** How a PR Check works: with only the scan (Solo) or with Trama's own checks as well (Collaborative). */
export type PrCheckVariant = "solo" | "collaborative";

/** `rules#pr-check`: Solo when Solo mode is on or the head has no `.trama/` at the project's prefix, Collaborative otherwise. */
export async function chooseVariant(p: Project, place: Place, head: string): Promise<PrCheckVariant> {
  if (readSoloMode(p) !== "off") return "solo";
  const listed = await gitOut(place.top, ["ls-tree", "--full-tree", head, "--", `${place.prefix}${TRAMA_DIR}`]);
  return listed.trim() === "" ? "solo" : "collaborative";
}

// ---- the fetch --------------------------------------------------------------

/** The commits a fetch brought: the head of the pull request and the tip of the branch it goes into. */
export interface Fetched {
  head: string;
  base: string;
}

const COMMIT = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/**
 * `git fetch --no-tags origin refs/pull/<n>/head refs/heads/<base branch>` and the two commits read from `FETCH_HEAD`, in the order the refs were named. `--refmap=` keeps git from
 * updating any remote-tracking ref: no branch, tag or other ref is created or moved.
 */
export async function fetchPullRequest(top: string, number: number, baseBranch: string): Promise<Fetched> {
  checkedNumber(number);
  checkedBranch(baseBranch);
  await gitOut(top, ["fetch", "--no-tags", "--refmap=", "origin", `refs/pull/${number}/head`, `refs/heads/${baseBranch}`], FETCH_TIMEOUT_MS);
  const file = (await gitOut(top, ["rev-parse", "--git-path", "FETCH_HEAD"])).replace(/\r?\n$/, "");
  const lines = readTextLf(join(top, file)).split("\n").filter((line) => line !== "");
  const [head, base] = lines.map((line) => line.split("\t")[0] ?? "");
  if (head === undefined || base === undefined || !COMMIT.test(head) || !COMMIT.test(base)) throw new TramaError("git fetch did not bring the pull request and its branch");
  return { head, base };
}

/** `git merge-base <base> <head>`: where the pull request left the branch it goes into. */
export async function mergeBaseOf(top: string, base: string, head: string): Promise<string> {
  const found = (await gitOut(top, ["merge-base", base, head])).trim();
  if (!COMMIT.test(found)) throw new TramaError("the pull request and its branch have no commit in common");
  return found;
}

// ---- the worktree -----------------------------------------------------------

/** The folder of the worktree of a pull request: `pr-check/<number>/` inside the editor's storage for the workspace. */
export const prCheckFolder = (storage: string, number: number): string => join(storage, "pr-check", String(checkedNumber(number)));

/**
 * `git worktree remove --force <folder>`, then `git worktree prune`. When git cannot remove it, the folder is deleted and the registration pruned. Returns null when the folder is gone,
 * otherwise why it could not be removed (git's first line of error).
 */
export async function removeWorktree(top: string, folder: string): Promise<string | null> {
  const removed = await gitRunAsync(top, ["worktree", "remove", "--force", folder]);
  let reason: string | null = null;
  if (!removed.ok) {
    reason = firstLine(removed.stderr) || firstLine(removed.stdout) || "git worktree remove failed";
    try {
      rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      await gitRunAsync(top, ["worktree", "prune"]);
      return existsSync(folder) ? reason : null;
    }
  }
  await gitRunAsync(top, ["worktree", "prune"]);
  return existsSync(folder) ? (reason ?? "the folder is still there") : null;
}

/** The detached worktree of `commit` in `folder`; a folder already there is removed first. */
export async function createWorktree(top: string, folder: string, commit: string): Promise<void> {
  if (!COMMIT.test(commit)) throw new TramaError(`"${commit}" is not a commit`);
  const gone = await removeWorktree(top, folder);
  if (gone !== null) throw new TramaError(gone);
  mkdirSync(dirname(folder), { recursive: true });
  await gitOut(top, ["worktree", "add", "--detach", folder, commit]);
}

/** The folders under `pr-check/` of the storage that none of the PR Checks in `inUse` (their numbers) uses. */
export function leftoverFolders(storage: string, inUse: readonly number[]): string[] {
  const parent = join(storage, "pr-check");
  let names: string[];
  try {
    names = readdirSync(parent);
  } catch {
    return [];
  }
  const used = new Set(inUse.map(String));
  return names.filter((name) => !used.has(name)).map((name) => join(parent, name));
}

// ---- Trama's own files ------------------------------------------------------

/** Whether the folder holds a `.gitignore` that contains `*`: a local folder of `.trama/`. */
export function isLocalFolder(folder: string): boolean {
  try {
    return readTextLf(join(folder, ".gitignore")).split("\n").some((line) => line.trim() === "*");
  } catch {
    return false;
  }
}

/** The paths of Trama's own files of a folder, relative to its root (`rules#pr-check`): `.trama/` (without its local folders), the skills folder and the three files of omp. */
export function ownPaths(p: Project, skillsDir: string): string[] {
  const skills = projectSkillsFolder(p.root, skillsDir);
  return [TRAMA_DIR, ...(skills === null ? [] : [skills]), ".omp/agents/trama-analysis.md", ".omp/agents/trama-implementer.md", ".omp/WATCHDOG.yml"];
}

/**
 * Solo: Trama's own files of the open folder replace those of the worktree, at the same paths. What the head had there is deleted first, so the scan sees the Model of the open
 * folder alone; the local folders of `.trama/` stay behind.
 */
export function copyOwnFiles(p: Project, worktreeRoot: string, skillsDir: string): void {
  const local = new Set(existsSync(p.dir) ? readdirSync(p.dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && isLocalFolder(join(p.dir, entry.name))).map((entry) => entry.name) : []);
  for (const path of ownPaths(p, skillsDir)) {
    const from = join(p.root, path);
    const to = join(worktreeRoot, path);
    rmSync(to, { recursive: true, force: true });
    if (!existsSync(from)) continue;
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, {
      recursive: true,
      filter: (source) => {
        if (path !== TRAMA_DIR) return true;
        const inside = source.slice(from.length).replace(/^[\\/]+/, "").split(/[\\/]/)[0] ?? "";
        return !local.has(inside);
      },
    });
  }
}

// ---- the report -------------------------------------------------------------

export type ReportSection = "model" | "model-problems" | "code" | "open-work";

/** The sections of a report, in the order its rows are shown. */
export const REPORT_SECTIONS: readonly ReportSection[] = ["model", "model-problems", "code", "open-work"];

/** One finding of a PR Check. `ref` has the form of the `refs` of the cards; `where` is a place in the code. */
export interface ReportRow {
  section: ReportSection;
  ref: string | null;
  finding: string;
  source: string;
  where: string | null;
}

export interface ReportCommit {
  branch: string;
  commit: string;
}

/** The report of the last PR Check of one pull request (`data#pull-request-report`), in `.trama/pr-checks/<number>.json`. */
export interface PullRequestReport {
  number: number;
  title: string;
  url: string;
  variant: PrCheckVariant;
  base: ReportCommit;
  head: ReportCommit;
  mergeBase: string;
  checkedAt: string;
  rows: ReportRow[];
}

/** The source of the rows of Trama's own checks. */
export const TRAMA_SOURCE = "Trama";

export const prChecksDir = (p: Project): string => join(p.dir, "pr-checks");
const reportFile = (p: Project, number: number): string => join(prChecksDir(p), `${number}.json`);

const ReportSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  url: z.string(),
  variant: z.enum(["solo", "collaborative"]),
  base: z.object({ branch: z.string(), commit: z.string() }),
  head: z.object({ branch: z.string(), commit: z.string() }),
  mergeBase: z.string(),
  checkedAt: z.string().refine((text) => !Number.isNaN(Date.parse(text))),
  rows: z.array(z.object({ section: z.enum(["model", "model-problems", "code", "open-work"]), ref: z.string().nullable(), finding: z.string(), source: z.string(), where: z.string().nullable() })),
});

/** The report in `text`, or null when it is not a valid report of pull request `number`. */
function parseReport(text: string, number: number): PullRequestReport | null {
  let value: unknown;
  try {
    value = JSON.parse(normalizeLf(text).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
  const parsed = ReportSchema.safeParse(value);
  return parsed.success && parsed.data.number === number ? parsed.data : null;
}

/** The numbers of the report files in `.trama/pr-checks/`, valid or not. */
function reportNumbers(p: Project): number[] {
  let names: string[];
  try {
    names = readdirSync(prChecksDir(p));
  } catch {
    return [];
  }
  return names.flatMap((name) => (/^[1-9][0-9]*\.json$/.test(name) ? [Number(name.slice(0, -".json".length))] : [])).sort((a, b) => a - b);
}

/** The report of pull request `number`, or null: a file that is not valid counts as no report. */
export function readReport(p: Project, number: number): PullRequestReport | null {
  try {
    return parseReport(readTextLf(reportFile(p, number)), number);
  } catch {
    return null;
  }
}

/** Every valid report of the working copy, by pull request number. */
export function readReports(p: Project): Map<number, PullRequestReport> {
  const reports = new Map<number, PullRequestReport>();
  for (const number of reportNumbers(p)) {
    const report = readReport(p, number);
    if (report !== null) reports.set(number, report);
  }
  return reports;
}

/** A report is outdated when the head of the pull request read from GitHub differs from the head it was made on. */
export const isOutdated = (report: PullRequestReport, head: string): boolean => report.head.commit !== head;

/** The folder keeps its own `.gitignore` with `*`, like the other local folders of `.trama/`, so no report ever enters a commit. */
function ensureIgnored(dir: string): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, ".gitignore");
  if (!isLocalFolder(dir)) writeFileAtomic(file, "*\n");
}

/** Deletes the files of the folder that are not valid reports: they count as no report. */
function deleteInvalid(p: Project): void {
  for (const number of reportNumbers(p)) if (readReport(p, number) === null) rmSync(reportFile(p, number), { force: true });
}

/** Writes the report of its pull request, replacing the previous one (a temporary file renamed, LF, a final newline); files that are not valid reports are deleted with it. */
export function writeReport(p: Project, report: PullRequestReport): void {
  checkedNumber(report.number);
  ensureIgnored(prChecksDir(p));
  deleteInvalid(p);
  writeFileAtomic(reportFile(p, report.number), `${JSON.stringify(report, null, 2)}\n`);
}

/** After a read of the pull requests that worked: deletes the report of every pull request not in `open`, and the files that are not valid reports. Returns the numbers deleted, in ascending order. */
export function deleteReportsExcept(p: Project, open: Iterable<number>): number[] {
  const keep = new Set(open);
  const gone: number[] = [];
  deleteInvalid(p);
  for (const number of reportNumbers(p)) {
    if (keep.has(number)) continue;
    rmSync(reportFile(p, number), { force: true });
    gone.push(number);
  }
  return gone;
}

const sectionRank = (row: ReportRow): number => REPORT_SECTIONS.indexOf(row.section);

/** Rows ordered by section and, within a section, by reference (a row with none comes last); rows alike stay in the order they were found. */
export function sortRows(rows: readonly ReportRow[]): ReportRow[] {
  return rows
    .map((row, at) => ({ row, at }))
    .sort((a, b) => {
      if (sectionRank(a.row) !== sectionRank(b.row)) return sectionRank(a.row) - sectionRank(b.row);
      const x = a.row.ref;
      const y = b.row.ref;
      if (x !== y) {
        if (x === null) return 1;
        if (y === null) return -1;
        return x < y ? -1 : 1;
      }
      return a.at - b.at;
    })
    .map(({ row }) => row);
}

// ---- the rows of the scan ---------------------------------------------------

/**
 * The rows of the cards the scan filed in the worktree after `launchedAt` (ms since the epoch), the same in both ways (`rules#pull-request-report`): a Task is `Missing in the code: <title>`,
 * a Drift is its title and its Where in the code. In Solo the source of a Drift marked `merge` is `This pull request` and of the others `Existing code`; in Collaborative every row is `Scan`.
 */
export function scanRows(worktree: Project, variant: PrCheckVariant, launchedAt: number): ReportRow[] {
  const filed = (created: string | null): boolean => created !== null && Date.parse(created) >= launchedAt;
  const rows: ReportRow[] = [];
  for (const task of listTasks(worktree))
    if (filed(task.data.created)) rows.push({ section: "code", ref: task.data.refs[0] ?? null, finding: `Missing in the code: ${task.title}`, source: variant === "solo" ? "Existing code" : "Scan", where: null });
  for (const drift of listDrifts(worktree)) {
    if (!filed(drift.data.created)) continue;
    const where = driftSides(drift)?.where?.trim() ?? "";
    rows.push({ section: "code", ref: drift.data.refs[0] ?? null, finding: drift.title, source: variant === "solo" ? (drift.data.merge ? "This pull request" : "Existing code") : "Scan", where: where === "" ? null : where });
  }
  return rows;
}

/**
 * Whether the agent delivered its scan in the worktree: the check it announced for the scan was moved to `delivered` (a `phase-end` of the scan with outcome `done` in the timings of
 * the worktree, at or after `launchedAt`). A check that failed, was withdrawn or never announced means the scan did not finish.
 */
export function scanDelivered(worktree: Project, launchedAt: number): boolean {
  return readTimingRecords(worktree).some((record) => record.event === "phase-end" && record.phase === "scanning" && record.outcome === "done" && Date.parse(record.at) >= launchedAt);
}

// ---- Trama's own checks (Collaborative) -------------------------------------

/** The commits and branches the checks compare. `place` is where the project sits in the repository. */
export interface ChecksInput {
  place: Place;
  baseBranch: string;
  base: string;
  head: string;
  mergeBase: string;
}

const isHidden = (path: string): boolean => path.split("/").some((part) => part.startsWith("."));

/** The paths of the files under `paths` at `commit` (`git ls-tree`), repository-relative. */
async function listAt(top: string, commit: string, paths: string[]): Promise<string[]> {
  const listed = await gitOut(top, ["ls-tree", "-r", "-z", "--name-only", "--full-tree", commit, "--", ...paths]);
  return listed.split("\0").filter((path) => path !== "");
}

/** The text of `path` at `commit` (`git show`), with LF line endings. */
async function showAt(top: string, commit: string, path: string): Promise<string> {
  return normalizeLf(await gitOut(top, ["show", `${commit}:${path}`]));
}

/** The Model, Requirements and Specs files as `commit` had them, keyed like `readTracked`: read from the git objects, no checkout. */
export async function trackedFilesAtCommit(place: Place, commit: string): Promise<FileMap> {
  const base = `${place.prefix}${TRAMA_DIR}/`;
  const paths = (await listAt(place.top, commit, [`${base}model`, `${base}requirements`, `${base}${SPECS_FILE}`])).filter((path) => !isHidden(path.slice(base.length)));
  const texts = await inPool(paths, (path) => showAt(place.top, commit, path));
  const files: FileMap = new Map();
  paths.forEach((path, at) => {
    const inside = path.slice(base.length);
    files.set(inside.startsWith("model/") ? inside.slice("model/".length) : inside, texts[at] as string);
  });
  return files;
}

/** The reference a tracked file is about, for the row of a file that changed without an approved Proposal; none for `system.md`. */
export function fileRef(path: string): string | null {
  if (path === SPECS_FILE) return "specs";
  if (path.startsWith(REQUIREMENTS_PREFIX)) return `${REQUIREMENTS_PREFIX}${path.slice(REQUIREMENTS_PREFIX.length).split("/")[0]}`;
  const parts = path.split("/");
  const name = (parts.at(-1) ?? "").replace(/\.md$/, "");
  if (parts.length === 1) return null;
  return name === "feature" ? (parts[0] as string) : name;
}

/** A temporary project holding `files` (paths under `.trama/`), for `use`; gone afterwards. */
function withTempProject<T>(files: ReadonlyMap<string, string>, use: (p: Project) => T): T {
  const root = mkdtempSync(join(tmpdir(), "trama-pr-check-"));
  try {
    for (const [path, text] of files) writeFileEnsuringDir(join(root, TRAMA_DIR, path), text);
    return use(projectAt(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The cards of the groups of files (a card's name and its files, under `.trama/`) as `list` reads them; a group that does not read is left out. */
function readCards<T>(groups: ReadonlyMap<string, ReadonlyMap<string, string>>, list: (p: Project) => T[]): T[] {
  const merged = new Map<string, string>();
  for (const files of groups.values()) for (const [path, text] of files) merged.set(path, text);
  try {
    return withTempProject(merged, list);
  } catch {
    return [...groups.values()].flatMap((files) => {
      try {
        return withTempProject(files, list);
      } catch {
        return [];
      }
    });
  }
}

/** The files added or changed between two commits under `paths` (`git diff --name-only`), repository-relative. Renames count as an added file. */
async function changedBetween(top: string, from: string, to: string, paths: string[]): Promise<string[]> {
  const listed = await gitOut(top, ["diff", "--name-only", "-z", "--no-renames", "--diff-filter=AM", from, to, "--", ...paths]);
  return listed.split("\0").filter((path) => path !== "");
}

/** A Proposal read from a commit, with the files it touches when they were asked for. */
interface ReadProposal {
  proposal: Proposal;
  touched: Set<string>;
}

/**
 * The Proposals of `commit`, read from `.trama/proposals/<name>/proposal.md` in a temporary project. For the Proposals `withFiles` accepts the files they hold are read as well, so that
 * `touchedFiles` knows what they change. A Proposal that does not read is left out.
 */
async function proposalsAt(place: Place, commit: string, withFiles: (name: string) => boolean): Promise<ReadProposal[]> {
  const base = `${place.prefix}${TRAMA_DIR}/proposals/`;
  const paths = await listAt(place.top, commit, [base.replace(/\/$/, "")]);
  const wanted = paths.filter((path) => {
    const rest = path.slice(base.length).split("/");
    const inside = rest.slice(1).join("/");
    if (inside === "proposal.md") return true;
    return withFiles(rest[0] as string) && !isHidden(inside) && (inside.startsWith("model/") || inside.startsWith("requirements/") || inside === SPECS_FILE);
  });
  const texts = await inPool(wanted, (path) => showAt(place.top, commit, path));
  const groups = new Map<string, Map<string, string>>();
  wanted.forEach((path, at) => {
    const rest = path.slice(base.length);
    const name = rest.split("/")[0] as string;
    const files = groups.get(name) ?? new Map<string, string>();
    files.set(`proposals/${rest}`, texts[at] as string);
    groups.set(name, files);
  });
  const read = (files: Iterable<ReadonlyMap<string, string>>): ReadProposal[] => {
    const merged = new Map<string, string>();
    for (const group of files) for (const [path, text] of group) merged.set(path, text);
    // `touchedFiles` reads the Proposal's folder, so it is read while the temporary project still stands.
    return withTempProject(merged, (project) => listProposals(project).map((proposal) => ({ proposal, touched: withFiles(proposal.name) ? touchedFiles(proposal) : new Set<string>() })));
  };
  try {
    return read(groups.values());
  } catch {
    return [...groups.values()].flatMap((files) => {
      try {
        return read([files]);
      } catch {
        return [];
      }
    });
  }
}

/**
 * Trama's own checks of a pull request that has `.trama/` (`rules#pull-request-report`), computed between the merge-base and the head from the git objects:
 * `Model` rows, one per element, section or field added, changed or removed, as `trama proposal show` lists the changes of a Proposal;
 * `Model problems` rows, for each error of `trama model check` on the head, each file changed without a Proposal approved in the pull request, and each element changed also on the branch it goes into;
 * `Open work` rows, for each Proposal in Draft or Open, Task in To do or In progress and Drift open at the head whose file the pull request added or changed. The source of all is `Trama`.
 */
export async function collaborativeRows(input: ChecksInput): Promise<ReportRow[]> {
  const { place, baseBranch, base, head, mergeBase } = input;
  const was = await trackedFilesAtCommit(place, mergeBase);
  const is = await trackedFilesAtCommit(place, head);
  const rows: ReportRow[] = [];
  const row = (section: ReportSection, ref: string | null, finding: string): void => void rows.push({ section, ref, finding, source: TRAMA_SOURCE, where: null });

  const changed = [...new Set([...was.keys(), ...is.keys()])].filter((path) => was.get(path) !== is.get(path)).sort();
  const entriesOf = (from: FileMap, to: FileMap, path: string) => {
    try {
      return diffEntries(path, from.get(path), to.get(path)).entries;
    } catch {
      return [];
    }
  };
  for (const path of changed) for (const entry of entriesOf(was, is, path)) row("model", entry.ref, entry.text);

  for (const diagnostic of buildProject(is).diagnostics) row("model-problems", null, formatDiagnostic(diagnostic));

  // The Proposals approved in the pull request are those approved at the head and not at the merge-base: they cover the files they touch.
  const approvedBefore = new Set((await proposalsAt(place, mergeBase, () => false)).filter(({ proposal }) => proposal.data.status === "approved").map(({ proposal }) => proposal.id));
  const atHead = await proposalsAt(place, head, () => false);
  const newlyApproved = new Set(atHead.filter(({ proposal }) => proposal.data.status === "approved" && !approvedBefore.has(proposal.id)).map(({ proposal }) => proposal.name));
  const proposalsNow = newlyApproved.size === 0 ? atHead : await proposalsAt(place, head, (name) => newlyApproved.has(name));
  const covered = new Set<string>();
  for (const { touched } of proposalsNow) for (const path of touched) covered.add(path);
  for (const path of changed) if (!covered.has(path)) row("model-problems", fileRef(path), "Changed without an approved Proposal");

  const theirs = await trackedFilesAtCommit(place, base);
  const bothSides = new Set<string>();
  for (const path of [...new Set([...was.keys(), ...theirs.keys()])].filter((path) => was.get(path) !== theirs.get(path)).sort()) {
    const there = new Set(entriesOf(was, theirs, path).map((entry) => entry.ref ?? `file:${path}`));
    for (const entry of entriesOf(was, is, path)) {
      const key = entry.ref ?? `file:${path}`;
      if (!there.has(key) || bothSides.has(key)) continue;
      bothSides.add(key);
      row("model-problems", entry.ref, `Also changed on ${baseBranch}`);
    }
  }

  // Open work: the cards the pull request added or changed that are still open at the head.
  const prefix = `${place.prefix}${TRAMA_DIR}/`;
  const touchedNames = (folder: string, paths: string[]): string[] => [...new Set(paths.filter((path) => path.startsWith(`${prefix}${folder}/`)).map((path) => path.slice(`${prefix}${folder}/`.length).split("/")[0] as string))];
  const addedOrChanged = await changedBetween(place.top, mergeBase, head, [`${prefix}proposals`, `${prefix}tasks`, `${prefix}drifts`]);
  const proposalNames = new Set(touchedNames("proposals", addedOrChanged));
  for (const { proposal } of proposalsNow)
    if (proposalNames.has(proposal.name) && (proposal.data.status === "draft" || proposal.data.status === "open")) row("open-work", null, `Proposal ${proposal.data.status === "draft" ? "in Draft" : "open"}: ${proposal.title}`);
  const cardFiles = async (folder: "tasks" | "drifts"): Promise<Map<string, Map<string, string>>> => {
    const names = touchedNames(folder, addedOrChanged).filter((name) => name.endsWith(".md") && !name.startsWith("."));
    const texts = await inPool(names, (name) => showAt(place.top, head, `${prefix}${folder}/${name}`));
    return new Map(names.map((name, at) => [name, new Map([[`${folder}/${name}`, texts[at] as string]])]));
  };
  for (const task of readCards(await cardFiles("tasks"), (project) => listTasks(project)))
    if (task.data.column !== "done") row("open-work", task.data.refs[0] ?? null, `Task ${task.data.column === "doing" ? "in progress" : "in To do"}: ${task.title}`);
  for (const drift of readCards(await cardFiles("drifts"), (project) => listDrifts(project).map((found) => ({ found, where: driftSides(found)?.where?.trim() ?? "" }))))
    if (drift.found.data.status === "open") rows.push({ section: "open-work", ref: drift.found.data.refs[0] ?? null, finding: `Open Drift: ${drift.found.title}`, source: TRAMA_SOURCE, where: drift.where === "" ? null : drift.where });
  return rows;
}

// ---- the preparation --------------------------------------------------------

/** What the preparation of a PR Check leaves ready for the launch. */
export interface PreparedCheck {
  number: number;
  /** The worktree: `pr-check/<number>/` in the storage. */
  folder: string;
  /** The project's root inside the worktree: where the agent works. */
  root: string;
  variant: PrCheckVariant;
  base: ReportCommit;
  head: ReportCommit;
  mergeBase: string;
  place: Place;
  /** The rows of Trama's own checks, computed before the agent starts; none in Solo. */
  rows: ReportRow[];
}

export interface PrepareOptions {
  /** `ExtensionContext.storageUri` of the window. */
  storage: string;
  /** The folder of the agent skills (`trama.skillsDir`). */
  skillsDir: string;
  /** Writes the skills, agent definitions and advisor instructions of this version into the worktree: the same code as the check at every opening. */
  writeSkills: (worktree: Project) => void;
}

/**
 * The preparation of a PR Check, in the order of `rules#pull-request-check`: fetch, worktree, copy (Solo) or Trama's own checks (Collaborative), skills. The first step that fails stops it,
 * removes what it created of the worktree and throws with the first line of git's error. Nothing changes in the open folder.
 */
export async function prepareCheck(p: Project, pr: Pick<PullRequest, "number" | "baseRefName" | "headRefName">, options: PrepareOptions): Promise<PreparedCheck> {
  const place = await placeOf(p.root);
  const fetched = await fetchPullRequest(place.top, pr.number, pr.baseRefName);
  const variant = await chooseVariant(p, place, fetched.head);
  const mergeBase = await mergeBaseOf(place.top, fetched.base, fetched.head);
  const folder = prCheckFolder(options.storage, pr.number);
  await createWorktree(place.top, folder, fetched.head);
  const root = place.prefix === "" ? folder : join(folder, place.prefix);
  try {
    let rows: ReportRow[] = [];
    if (variant === "solo") copyOwnFiles(p, root, options.skillsDir);
    else rows = await collaborativeRows({ place, baseBranch: pr.baseRefName, base: fetched.base, head: fetched.head, mergeBase });
    options.writeSkills(projectAt(root));
    return { number: pr.number, folder, root, variant, base: { branch: pr.baseRefName, commit: fetched.base }, head: { branch: pr.headRefName, commit: fetched.head }, mergeBase, place, rows };
  } catch (error) {
    await removeWorktree(place.top, folder);
    throw error;
  }
}

/** The report of a PR Check that ended with its scan delivered: its rows are Trama's checks and the cards of the scan, in the order of the report. */
export function buildReport(prepared: PreparedCheck, pr: Pick<PullRequest, "title" | "url">, scan: readonly ReportRow[], checkedAt: Date = new Date()): PullRequestReport {
  return {
    number: prepared.number,
    title: pr.title,
    url: pr.url,
    variant: prepared.variant,
    base: prepared.base,
    head: prepared.head,
    mergeBase: prepared.mergeBase,
    checkedAt: checkedAt.toISOString(),
    rows: sortRows([...prepared.rows, ...scan]),
  };
}

/** The instruction of a PR Check (`rules#pull-request-check`): one line, followed in Solo by the commits the pull request brought. */
export function prCheckInstruction(prepared: Pick<PreparedCheck, "number" | "variant" | "mergeBase" | "head">): string {
  const line = `Use the trama-scan skill on the whole System. This is the PR Check of pull request #${prepared.number}, in a worktree of its own: file the cards here, and do not run, build or install anything of the pull request.`;
  if (prepared.variant === "collaborative") return line;
  const range = `${prepared.mergeBase}...${prepared.head.commit}`;
  return `${line} A merge brought in \`${range}\`: mark \`merge\` on every Drift whose Where in the code lies in a file \`git diff --name-only ${range}\` lists.`;
}
