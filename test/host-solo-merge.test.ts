import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A minimal editor: what the flow shows is recorded, and the answers of the developer are set by each test.
const infos: string[] = [];
const warnings: { message: string; options: unknown; buttons: string[] }[] = [];
const errors: string[] = [];
const quickPicks: { items: { label: string; description?: string }[]; options: { title?: string; placeHolder?: string } }[] = [];
const progress: string[] = [];
const executed: unknown[][] = [];
const shown: string[] = [];
let workspaceFolders: { uri: { fsPath: string; scheme: string } }[] = [];
let pick: string | undefined;
let answer: ((message: string, options: unknown, buttons: string[]) => string | undefined) | undefined;
let commands: string[] = [];
const watchers: { pattern: unknown; listeners: (() => void)[] }[] = [];

mock.module("vscode", () => ({
  window: {
    showInformationMessage: async (message: string) => void infos.push(message),
    showErrorMessage: async (message: string) => void errors.push(message),
    showWarningMessage: async (message: string, ...rest: unknown[]) => {
      const options = typeof rest[0] === "object" && rest[0] !== null ? rest[0] : undefined;
      const buttons = rest.filter((item): item is string => typeof item === "string");
      warnings.push({ message, options, buttons });
      return answer?.(message, options, buttons);
    },
    showQuickPick: async (items: { label: string; description?: string; branch?: unknown }[], options: { title?: string; placeHolder?: string }) => {
      quickPicks.push({ items: items.map(({ label, description }) => ({ label, ...(description === undefined ? {} : { description }) })), options });
      return items.find((item) => item.label === pick);
    },
    withProgress: async (options: { title?: string }, task: () => Promise<unknown>) => {
      progress.push(options.title ?? "");
      return task();
    },
    showTextDocument: async (uri: { fsPath: string }) => void shown.push(uri.fsPath),
  },
  workspace: {
    get workspaceFolders() {
      return workspaceFolders;
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback, inspect: () => undefined }),
    onDidChangeWorkspaceFolders: () => ({ dispose() {} }),
    onDidSaveTextDocument: () => ({ dispose() {} }),
    onDidChangeConfiguration: () => ({ dispose() {} }),
    createFileSystemWatcher: (pattern: unknown) => {
      const entry = { pattern, listeners: [] as (() => void)[] };
      watchers.push(entry);
      const subscribe = (listener: () => void) => (entry.listeners.push(listener), { dispose() {} });
      return { dispose() {}, onDidCreate: subscribe, onDidChange: subscribe, onDidDelete: subscribe };
    },
  },
  commands: {
    getCommands: async () => commands,
    executeCommand: async (...args: unknown[]) => void executed.push(args),
  },
  ProgressLocation: { Notification: 15 },
  RelativePattern: class {
    constructor(
      readonly base: { fsPath: string },
      readonly pattern: string,
    ) {}
  },
  EventEmitter: class {
    private readonly listeners: ((value: unknown) => void)[] = [];
    readonly event = (listener: (value: unknown) => void) => (this.listeners.push(listener), { dispose() {} });
    fire(value?: unknown) {
      for (const listener of [...this.listeners]) listener(value);
    }
    dispose() {}
  },
  Uri: { file: (path: string) => ({ fsPath: path, scheme: "file", toString: () => path }), joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts) }) },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: { dispose(): void }[]) {
      return { dispose: () => items.forEach((item) => item.dispose()) };
    }
  },
  ViewColumn: { Active: 1, Beside: -2 },
  env: { appName: "Visual Studio Code" },
}));

// The modules load after mock.module replaced "vscode".
const { SoloMerge } = await import("../extension/src/host/solo-merge");
const { setSoloMode } = await import("../src/core/solo-mode");
const { projectAt } = await import("../src/core/store");
const { mergeFile, readOpenMerge } = await import("../src/core/solo-merge");

const GIT_TEST_MS = 60_000;
let base: string;
let origin: string;
let work: string;
let other: string;
let launched: unknown[];
let flow: InstanceType<typeof SoloMerge>;

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "-c", "core.editor=true", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
    killSignal: "SIGKILL",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
  return r.stdout.trim();
}

function commit(repo: string, message: string, files: Record<string, string>): string {
  for (const [name, text] of Object.entries(files)) writeFileSync(join(repo, name), text);
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", message);
  return git(repo, "rev-parse", "HEAD");
}

beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "trama-host-merge-")));
  origin = join(base, "origin.git");
  work = join(base, "work");
  other = join(base, "other");
  git(base, "init", "-q", "--bare", "-b", "main", origin);
  git(base, "clone", "-q", origin, work);
  git(work, "checkout", "-q", "-b", "main");
  commit(work, "first", { "a.txt": "one\n", "c.txt": "line\n" });
  git(work, "push", "-q", "-u", "origin", "main");
  git(base, "clone", "-q", origin, other);
  const project = projectAt(work);
  mkdirSync(project.dir, { recursive: true });
  setSoloMode(project, "folders");
  workspaceFolders = [{ uri: { fsPath: work, scheme: "file" } }];
  infos.length = warnings.length = errors.length = quickPicks.length = progress.length = executed.length = shown.length = watchers.length = 0;
  pick = undefined;
  answer = undefined;
  commands = [];
  launched = [];
  flow = new SoloMerge(async (action) => void launched.push(action));
});

afterEach(() => {
  flow.dispose();
  rmSync(base, { recursive: true, force: true });
});

/** Lets the promises the flow leaves running (the notice's choice, the scan's launch) finish. */
const settled = async (): Promise<void> => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};

/** Pushes to `origin/main` from the second clone. */
const push = (files: Record<string, string>): string => {
  const hash = commit(other, "other", files);
  git(other, "push", "-q", "origin", "HEAD:main");
  return hash;
};

test("state is absent with Solo mode off and carries the availability, the reason and the tracked files of Trama with it on", () => {
  expect(flow.state()).toEqual({ available: true, trackedTrama: false });
  writeFileSync(join(work, "a.txt"), "changed\n");
  expect(flow.state()).toEqual({ available: false, reason: "changes", trackedTrama: false });
  git(work, "checkout", "--", "a.txt");
  git(work, "add", "-f", ".trama/solo/mode.json");
  expect(flow.state()?.trackedTrama).toBe(true);
  setSoloMode(projectAt(work), "off");
  expect(flow.state()).toBeUndefined();
}, GIT_TEST_MS);

test("a merge without conflicts shows Fetching…, the list with the upstream first, merges and starts the scan of the commits it brought in", async () => {
  const incoming = push({ "a.txt": "two\n" });
  git(work, "branch", "feature");
  pick = "origin/main";
  const base0 = git(work, "rev-parse", "HEAD");
  await flow.merge();
  expect(progress).toEqual(["Fetching…"]);
  expect(quickPicks).toHaveLength(1);
  expect(quickPicks[0]?.options).toEqual({ title: "Merge into main", placeHolder: "Choose the branch to merge" });
  expect(quickPicks[0]?.items).toEqual([{ label: "origin/main", description: "upstream" }, { label: "feature" }]);
  expect(warnings).toEqual([]);
  expect(infos).toEqual(["Trama: merged origin/main. Scanning the System."]);
  expect(launched).toEqual([{ kind: "mergeScan", base: base0, incoming }]);
  expect(existsSync(mergeFile(projectAt(work)))).toBe(false);
}, GIT_TEST_MS);

test("a fast-forward counts as a merge without conflicts", async () => {
  push({ "a.txt": "two\n" });
  pick = "origin/main";
  await flow.merge();
  expect(git(work, "rev-parse", "HEAD")).toBe(git(work, "rev-parse", "origin/main"));
  expect(launched).toHaveLength(1);
}, GIT_TEST_MS);

test("a branch already contained says so and launches nothing", async () => {
  pick = "origin/main";
  await flow.merge();
  expect(infos).toEqual(["Trama: main is already up to date with origin/main."]);
  expect(launched).toEqual([]);
  expect(existsSync(mergeFile(projectAt(work)))).toBe(false);
}, GIT_TEST_MS);

test("Escape in the list does nothing", async () => {
  push({ "a.txt": "two\n" });
  pick = undefined;
  await flow.merge();
  expect(infos).toEqual([]);
  expect(launched).toEqual([]);
  expect(git(work, "rev-parse", "HEAD")).not.toBe(git(work, "rev-parse", "origin/main"));
}, GIT_TEST_MS);

test("a failed fetch stops before the list with the reason of git", async () => {
  git(work, "remote", "set-url", "origin", join(base, "missing.git"));
  await flow.merge();
  expect(quickPicks).toEqual([]);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/^Trama: could not fetch: .+[^.]\.$/);
  expect(launched).toEqual([]);
}, GIT_TEST_MS);

test("a branch that is not the upstream asks the modal confirmation; cancelling merges nothing and confirming merges", async () => {
  git(work, "checkout", "-q", "-b", "feature");
  commit(work, "feature", { "f.txt": "f\n" });
  git(work, "checkout", "-q", "main");
  pick = "feature";
  answer = () => undefined;
  await flow.merge();
  expect(warnings).toEqual([{ message: "Merge feature into main?", options: { modal: true, detail: "feature is not the upstream of main." }, buttons: ["Merge"] }]);
  expect(launched).toEqual([]);
  expect(existsSync(join(work, "f.txt"))).toBe(false);
  warnings.length = 0;
  answer = () => "Merge";
  await flow.merge();
  expect(existsSync(join(work, "f.txt"))).toBe(true);
  expect(launched).toHaveLength(1);
}, GIT_TEST_MS);

test("a merge git refuses shows its reason and changes nothing", async () => {
  git(work, "checkout", "-q", "-b", "feature");
  commit(work, "feature", { "f.txt": "f\n" });
  git(work, "checkout", "-q", "main");
  writeFileSync(join(work, "f.txt"), "mine\n");
  pick = "feature";
  answer = () => "Merge";
  await flow.merge();
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/^Trama: could not merge feature: .+[^.]\.$/);
  expect(launched).toEqual([]);
  expect(existsSync(mergeFile(projectAt(work)))).toBe(false);
}, GIT_TEST_MS);

test("Merge does nothing while a change to a tracked file makes it unavailable", async () => {
  push({ "a.txt": "two\n" });
  writeFileSync(join(work, "a.txt"), "dirty\n");
  pick = "origin/main";
  await flow.merge();
  expect(progress).toEqual([]);
  expect(warnings).toEqual([{ message: "Trama: Commit or stash your changes to merge.", options: undefined, buttons: [] }]);
}, GIT_TEST_MS);

/** A merge of `origin/main` that conflicts on `c.txt`, started through the flow; the warning's answer is `choice`. */
async function conflicted(choice?: string): Promise<void> {
  commit(work, "mine", { "c.txt": "mine\n" });
  push({ "c.txt": "theirs\n" });
  pick = "origin/main";
  answer = (message) => (message.startsWith("Trama: merging") ? choice : undefined);
  await flow.merge();
  await settled();
}

test("a merge with conflicts is remembered and offers the three ways to go on; closing the warning chooses nothing", async () => {
  await conflicted();
  expect(warnings).toEqual([{ message: "Trama: merging origin/main left conflicts in 1 file.", options: undefined, buttons: ["Open Merge Editor", "Reconcile with Agent", "Abort"] }]);
  const merge = readOpenMerge(projectAt(work));
  expect(merge?.branch).toBe("origin/main");
  expect(flow.state()).toEqual({ available: false, reason: "inProgress", trackedTrama: false, open: { branch: "origin/main", conflict: true } });
  expect(launched).toEqual([]);
}, GIT_TEST_MS);

test("Open Merge Editor runs git.openMergeEditor on the first file with conflicts, or opens the file when the command is missing", async () => {
  await conflicted();
  commands = ["git.openMergeEditor"];
  await flow.openMergeEditor();
  expect(executed).toEqual([["git.openMergeEditor", { fsPath: join(work, "c.txt"), scheme: "file", toString: expect.any(Function) }]]);
  commands = [];
  await flow.openMergeEditor();
  expect(shown).toEqual([join(work, "c.txt")]);
}, GIT_TEST_MS);

test("Reconcile with Agent launches the agent on the merge in progress", async () => {
  await conflicted("Reconcile with Agent");
  expect(launched).toEqual([{ kind: "reconcileMerge", branch: "origin/main" }]);
  expect(readOpenMerge(projectAt(work))).not.toBeNull();
}, GIT_TEST_MS);

test("Abort asks the modal confirmation, then aborts, forgets the merge and scans nothing; declining leaves the merge open", async () => {
  await conflicted("Abort");
  const modal = warnings.at(-1);
  expect(modal).toEqual({ message: "Abort the merge of origin/main?", options: { modal: true, detail: "Every change of the merge is undone." }, buttons: ["Abort Merge"] });
  expect(readOpenMerge(projectAt(work))).not.toBeNull();
  answer = () => "Abort Merge";
  await flow.abort();
  expect(readOpenMerge(projectAt(work))).toBeNull();
  expect(git(work, "status", "--porcelain", "--untracked-files=no")).toBe("");
  expect(launched).toEqual([]);
  expect(flow.state()?.open).toBeUndefined();
}, GIT_TEST_MS);

test("a failed abort says why and the merge stays open", async () => {
  await conflicted();
  writeFileSync(join(work, ".git", "index.lock"), "");
  answer = () => "Abort Merge";
  await flow.abort();
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/^Trama: could not abort the merge: .+[^.]\.$/);
  expect(readOpenMerge(projectAt(work))).not.toBeNull();
}, GIT_TEST_MS);

test("a merge committed by the developer starts the scan of its base and incoming when the check sees it, once", async () => {
  await conflicted();
  const merge = readOpenMerge(projectAt(work));
  writeFileSync(join(work, "c.txt"), "both\n");
  git(work, "add", "c.txt");
  git(work, "commit", "-q", "--no-edit");
  flow.check();
  flow.check();
  await settled();
  expect(launched).toEqual([{ kind: "mergeScan", base: merge?.base, incoming: merge?.incoming }]);
  expect(readOpenMerge(projectAt(work))).toBeNull();
}, GIT_TEST_MS);

test("a merge aborted outside Trama is forgotten with no scan, and an open merge is left alone", async () => {
  await conflicted();
  flow.check();
  expect(readOpenMerge(projectAt(work))).not.toBeNull();
  git(work, "merge", "--abort");
  flow.check();
  expect(readOpenMerge(projectAt(work))).toBeNull();
  expect(launched).toEqual([]);
}, GIT_TEST_MS);

test("a remembered merge that is not valid is deleted at the check, with no scan", () => {
  writeFileSync(mergeFile(projectAt(work)), "not json");
  flow.check();
  expect(existsSync(mergeFile(projectAt(work)))).toBe(false);
  expect(launched).toEqual([]);
}, GIT_TEST_MS);

test("a scan that cannot start is reported like any launch and not tried again", async () => {
  flow.dispose();
  let attempts = 0;
  flow = new SoloMerge(async () => {
    attempts += 1;
    throw new Error("omp is missing");
  });
  push({ "a.txt": "two\n" });
  pick = "origin/main";
  await flow.merge();
  expect(attempts).toBe(1);
  expect(errors).toEqual(["Trama: Unexpected error: omp is missing"]);
}, GIT_TEST_MS);

test("start watches HEAD, MERGE_HEAD and the index of the git directory and the refs, and looks at the remembered merge at once", async () => {
  await conflicted();
  const merge = readOpenMerge(projectAt(work));
  git(work, "merge", "--abort");
  git(work, "checkout", "-q", "main");
  // Back to a remembered merge whose commit exists: the developer committed it while the window was closed.
  writeFileSync(mergeFile(projectAt(work)), `${JSON.stringify({ ...merge, started: new Date().toISOString() })}\n`);
  git(work, "merge", "-q", "--no-edit", "origin/main", "-X", "ours");
  const subscription = flow.start();
  await settled();
  expect(launched).toEqual([{ kind: "mergeScan", base: merge?.base, incoming: merge?.incoming }]);
  const patterns = watchers.map((watcher) => watcher.pattern as { base?: { fsPath: string }; pattern?: string }).filter((pattern) => pattern.pattern !== undefined);
  expect(patterns.map((pattern) => pattern.pattern)).toEqual(["{HEAD,MERGE_HEAD,index}", "{refs/**,packed-refs}"]);
  expect(patterns[0]?.base?.fsPath).toBe(join(work, ".git"));
  subscription.dispose();
}, GIT_TEST_MS);
