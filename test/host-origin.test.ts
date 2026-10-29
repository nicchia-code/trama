import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { managerStatus, originOf, setManagerMode, teamUnavailableReason } from "../src/core/manager-mode";
import { projectAt } from "../src/core/store";

// The window's git directories and origin need the editor only for the default watcher of `config`, which these tests replace.
mock.module("vscode", () => ({
  workspace: { workspaceFolders: [], getWorkspaceFolder: () => undefined },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

const { GitDirectories } = await import("../extension/src/host/git-directories");
const { ProjectOrigin } = await import("../extension/src/host/origin");

let root: string;
let addresses: Record<string, string | null>;
let dirsReads: string[];
let originReads: string[];
let configChanged: (() => void) | undefined;
let configWatchers: number;
let git: InstanceType<typeof GitDirectories>;
let origin: InstanceType<typeof ProjectOrigin>;
let stop: { dispose(): void };
let projectRoot: string | undefined;

/** Lets the reads the window starts in the background finish: git's directories first, then the origin they lead to. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await git.get();
  await new Promise((resolve) => setImmediate(resolve));
  await origin.settled();
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "trama-origin-"));
  projectRoot = root;
  addresses = { [root]: "https://github.com/Acme/Shop.git" };
  dirsReads = [];
  originReads = [];
  configChanged = undefined;
  configWatchers = 0;
  git = new GitDirectories({
    projectRoot: () => projectRoot,
    read: async (at) => {
      dirsReads.push(at);
      return addresses[at] === undefined ? undefined : { dir: join(at, ".git"), common: join(at, ".git") };
    },
    watch: (_common, onChange) => {
      configWatchers++;
      configChanged = onChange;
      return { dispose: () => (configChanged = undefined) };
    },
  });
  origin = new ProjectOrigin(git, async (at) => {
    originReads.push(at);
    return originOf(addresses[at] ?? null);
  });
  stop = origin.start();
});

afterEach(() => {
  stop.dispose();
  git.dispose();
  rmSync(root, { recursive: true, force: true });
});

test("origin is read once when the window opens the project, and not again by anything but a change of git's config", async () => {
  expect(origin.get()).toEqual({ repository: null, reason: "No origin remote" });
  git.follow();
  await flush();
  expect(origin.get()).toEqual({ repository: "acme/shop", reason: null });
  expect(originReads).toEqual([root]);
  expect(dirsReads).toEqual([root]);
  // A picture, a view, an opening of the panel or of Settings asks for the same project again: nothing is read.
  for (let picture = 0; picture < 5; picture++) git.follow();
  await flush();
  expect(origin.get().repository).toBe("acme/shop");
  expect(originReads).toHaveLength(1);
  expect(dirsReads).toHaveLength(1);
  expect(configWatchers).toBe(1);
});

test("a change of git's config reads origin again, and the listeners hear of it only when the value is another", async () => {
  git.follow();
  await flush();
  let heard = 0;
  origin.onDidChange(() => heard++);
  configChanged?.();
  await flush();
  expect(originReads).toHaveLength(2);
  expect(heard).toBe(0);
  addresses[root] = "git@gitlab.com:acme/shop.git";
  configChanged?.();
  await flush();
  expect(originReads).toHaveLength(3);
  expect(origin.get()).toEqual({ repository: null, reason: "Origin is not on GitHub" });
  expect(heard).toBe(1);
  addresses[root] = "ssh://git@github.com/acme/other";
  configChanged?.();
  await flush();
  expect(origin.get().repository).toBe("acme/other");
  expect(heard).toBe(2);
});

test("no project, no repository or a failed git call is no origin remote, and nothing is read for them", async () => {
  projectRoot = undefined;
  git.follow();
  await flush();
  expect(origin.get()).toEqual({ repository: null, reason: "No origin remote" });
  expect(dirsReads).toEqual([]);
  const elsewhere = join(root, "elsewhere");
  mkdirSync(elsewhere);
  projectRoot = elsewhere;
  git.follow();
  await flush();
  // The folder is in no repository: git's directories are unknown and origin is not asked.
  expect(dirsReads).toEqual([elsewhere]);
  expect(originReads).toEqual([]);
  expect(origin.get().repository).toBeNull();
});

test("the core's Team functions take the window's value while it follows, and read git again once it stops", async () => {
  git.follow();
  await flush();
  const project = projectAt(root);
  mkdirSync(project.dir, { recursive: true });
  // The address is not read from git: there is no repository in the folder, yet Manager mode can be turned on.
  setManagerMode(project, true);
  expect(managerStatus(project)).toMatchObject({ recorded: true, available: true, repository: "acme/shop" });
  expect(teamUnavailableReason(project)).toBeNull();
  // Another folder is not the window's project: no origin.
  expect(managerStatus(projectAt(join(root, "x"))).repository).toBeNull();
  stop.dispose();
  // Without the window, the command line's way: git is asked, and the folder has no repository.
  expect(managerStatus(project).repository).toBeNull();
  stop = origin.start();
});

test("the origin of a folder the window does not follow yet can be read for the setup wizard", async () => {
  const folder = join(root, "new");
  mkdirSync(folder);
  addresses[folder] = "https://github.com/acme/new";
  let heard = 0;
  origin.onDidChange(() => heard++);
  await origin.readFor(folder);
  expect(origin.get().repository).toBe("acme/new");
  expect(heard).toBe(1);
  const project = projectAt(folder);
  mkdirSync(project.dir, { recursive: true });
  expect(() => setManagerMode(project, true)).not.toThrow();
});
