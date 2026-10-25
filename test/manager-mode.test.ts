import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { TramaError } from "../src/core/errors";
import {
  MANAGER_NEEDS_GITHUB,
  managerFile,
  managerStatus,
  NO_ORIGIN,
  ORIGIN_NOT_GITHUB,
  originOf,
  parseGithubRepository,
  readManagerMode,
  readOrigin,
  setManagerMode,
} from "../src/core/manager-mode";
import { setSoloMode } from "../src/core/solo-mode";
import { projectAt } from "../src/core/store";

const GIT_TEST_MS = 60_000;

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-manager-"));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
  return r.stdout;
}

/** A git repository in `base` with the given `origin` (none when null), and its project folder. */
function repo(origin: string | null) {
  git(base, "init", "-q");
  if (origin !== null) git(base, "remote", "add", "origin", origin);
  return projectAt(base);
}

describe("the repository of an origin address", () => {
  test("the four forms of GitHub, with or without .git and a final slash, in lower case", () => {
    for (const address of [
      "https://github.com/Acme/Web",
      "https://github.com/Acme/Web.git",
      "https://github.com/Acme/Web/",
      "https://github.com/Acme/Web.git/",
      "http://github.com/acme/web",
      "http://github.com/ACME/WEB.git",
      "git@github.com:Acme/Web",
      "git@github.com:acme/web.git",
      "git@github.com:acme/web.git/",
      "ssh://git@github.com/acme/web",
      "ssh://git@github.com/acme/web.git/",
      "  https://github.com/acme/web\n",
    ])
      expect(parseGithubRepository(address)).toBe("acme/web");
  });

  test("a repository name with dots, dashes and underscores keeps them", () => {
    expect(parseGithubRepository("https://github.com/acme/my.web_app-2.git")).toBe("acme/my.web_app-2");
    expect(parseGithubRepository("git@github.com:acme/web.js")).toBe("acme/web.js");
  });

  test("any other host, GitHub Enterprise included, and any other shape is not GitHub", () => {
    for (const address of [
      "https://gitlab.com/acme/web",
      "git@gitlab.com:acme/web.git",
      "https://github.example.com/acme/web",
      "git@github.example.com:acme/web",
      "ssh://git@ghe.acme.test/acme/web",
      "https://github.com/acme",
      "https://github.com/acme/web/tree/main",
      "https://github.com/",
      "git://github.com/acme/web",
      "/srv/git/web.git",
      "",
    ])
      expect(parseGithubRepository(address)).toBeNull();
  });

  test("the origin says the repository, or why there is none", () => {
    expect(originOf("https://github.com/Acme/Web.git\n")).toEqual({ repository: "acme/web", reason: null });
    expect(originOf("https://gitlab.com/acme/web\n")).toEqual({ repository: null, reason: ORIGIN_NOT_GITHUB });
    expect(originOf(null)).toEqual({ repository: null, reason: NO_ORIGIN });
    expect(originOf("\n")).toEqual({ repository: null, reason: NO_ORIGIN });
    expect(NO_ORIGIN).toBe("No origin remote");
    expect(ORIGIN_NOT_GITHUB).toBe("Origin is not on GitHub");
  });
});

describe("reading the origin of a working copy", () => {
  test("a repository with its origin on GitHub", () => {
    repo("git@github.com:Acme/Web.git");
    expect(readOrigin(base)).toEqual({ repository: "acme/web", reason: null });
  }, GIT_TEST_MS);

  test("an origin elsewhere, no origin, and no git at all", () => {
    repo("https://git.example.org/acme/web");
    expect(readOrigin(base)).toEqual({ repository: null, reason: ORIGIN_NOT_GITHUB });
    git(base, "remote", "remove", "origin");
    expect(readOrigin(base)).toEqual({ repository: null, reason: NO_ORIGIN });
    const outside = mkdtempSync(join(tmpdir(), "trama-manager-nogit-"));
    try {
      expect(readOrigin(join(outside, "missing"))).toEqual({ repository: null, reason: NO_ORIGIN });
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  }, GIT_TEST_MS);

  test("another remote than origin does not count", () => {
    repo(null);
    git(base, "remote", "add", "upstream", "https://github.com/acme/web");
    expect(readOrigin(base)).toEqual({ repository: null, reason: NO_ORIGIN });
  }, GIT_TEST_MS);
});

describe("the mode file", () => {
  test("it is off without the file, and on with whatever the file holds", () => {
    const p = projectAt(base);
    mkdirSync(p.dir, { recursive: true });
    expect(readManagerMode(p)).toBe(false);
    mkdirSync(join(p.dir, "manager"));
    writeFileSync(managerFile(p), "not json {");
    expect(readManagerMode(p)).toBe(true);
    writeFileSync(managerFile(p), "{}\r\n");
    expect(readManagerMode(p)).toBe(true);
  });

  test("turning it on writes `{}` with LF and a final newline, and a .gitignore of the folder with `*`", () => {
    const p = repo("https://github.com/acme/web");
    expect(setManagerMode(p, true)).toEqual({ repository: "acme/web", reason: null });
    expect(readFileSync(managerFile(p), "utf8")).toBe("{}\n");
    expect(readFileSync(join(p.dir, "manager", ".gitignore"), "utf8")).toBe("*\n");
    expect(readManagerMode(p)).toBe(true);
  }, GIT_TEST_MS);

  test("a file that is not JSON is replaced by the next write", () => {
    const p = repo("https://github.com/acme/web");
    mkdirSync(join(p.dir, "manager"), { recursive: true });
    writeFileSync(managerFile(p), "garbage");
    setManagerMode(p, true);
    expect(readFileSync(managerFile(p), "utf8")).toBe("{}\n");
  }, GIT_TEST_MS);

  test("turning it off deletes only the file, leaving the folder with its .gitignore and the other files of Trama", () => {
    const p = repo("https://github.com/acme/web");
    mkdirSync(join(p.dir, "team"), { recursive: true });
    writeFileSync(join(p.dir, "team", "work.md"), "x\n");
    setManagerMode(p, true);
    setManagerMode(p, false);
    expect(existsSync(managerFile(p))).toBe(false);
    expect(readFileSync(join(p.dir, "manager", ".gitignore"), "utf8")).toBe("*\n");
    expect(readFileSync(join(p.dir, "team", "work.md"), "utf8")).toBe("x\n");
    expect(readManagerMode(p)).toBe(false);
    setManagerMode(p, false);
  }, GIT_TEST_MS);

  test("turning it on without origin on GitHub is refused, writes nothing, and turning it off still works", () => {
    const p = repo("https://gitlab.com/acme/web");
    expect(() => setManagerMode(p, true)).toThrow(MANAGER_NEEDS_GITHUB);
    expect(existsSync(join(p.dir, "manager"))).toBe(false);
    expect(MANAGER_NEEDS_GITHUB).toBe("Manager Mode needs a repository on GitHub (the origin remote).");
    mkdirSync(join(p.dir, "manager"), { recursive: true });
    writeFileSync(managerFile(p), "{}\n");
    expect(() => setManagerMode(p, false)).not.toThrow();
    expect(existsSync(managerFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("a write that fails says why, as a TramaError", () => {
    const p = repo("https://github.com/acme/web");
    // A file where the folder should be.
    mkdirSync(p.dir, { recursive: true });
    writeFileSync(join(p.dir, "manager"), "x");
    expect(() => setManagerMode(p, true)).toThrow(TramaError);
    expect(() => setManagerMode(p, true)).toThrow(/Could not write .*mode\.json/);
  }, GIT_TEST_MS);

  test("it never reaches git, with Solo mode on or off", () => {
    const p = repo("https://github.com/acme/web");
    run(["--root", base, "project", "new"], base);
    git(base, "add", "-A");
    git(base, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "x");
    setManagerMode(p, true);
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("");
    expect(git(base, "ls-files", ".trama/manager")).toBe("");
    setSoloMode(p, "folders");
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("");
    expect(git(base, "ls-files", ".trama/manager")).toBe("");
    setSoloMode(p, "off");
    expect(git(base, "check-ignore", "-q", ".trama/manager/mode.json")).toBe("");
  }, GIT_TEST_MS);
});

describe("the status the panel shows", () => {
  test("Team is available only with Manager mode recorded and origin on GitHub", () => {
    const p = repo("https://github.com/acme/web");
    expect(managerStatus(p)).toEqual({ available: false, recorded: false, repository: "acme/web", reason: null });
    setManagerMode(p, true);
    expect(managerStatus(p)).toEqual({ available: true, recorded: true, repository: "acme/web", reason: null });
    // Origin moves away: still recorded, Team not available, and read again at once.
    git(base, "remote", "set-url", "origin", "https://gitlab.com/acme/web");
    expect(managerStatus(p)).toEqual({ available: false, recorded: true, repository: null, reason: ORIGIN_NOT_GITHUB });
    git(base, "remote", "remove", "origin");
    expect(managerStatus(p)).toEqual({ available: false, recorded: true, repository: null, reason: NO_ORIGIN });
    git(base, "remote", "add", "origin", "git@github.com:Acme/Web.git");
    expect(managerStatus(p)).toEqual({ available: true, recorded: true, repository: "acme/web", reason: null });
  }, GIT_TEST_MS);
});

describe("trama project new, edit and show with manager", () => {
  const json = (argv: string[]): { exit: number; data: Record<string, unknown>; out: string } => {
    let r: { out: string; exit: number };
    try {
      r = run([...argv, "--json"], base, {});
    } catch (error) {
      return { exit: 1, data: {}, out: error instanceof Error ? error.message : String(error) };
    }
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(r.out);
    } catch {
      // A refusal prints text.
    }
    return { exit: r.exit, data, out: r.out };
  };
  const text = (argv: string[]): string => run(["--root", base, ...argv], base, {}).out;

  test("project new with manager writes it after the project's files", () => {
    const p = repo("https://github.com/Acme/Web.git");
    const r = json(["--root", base, "project", "new", "--input", JSON.stringify({ manager: true })]);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ manager: true, managerRepository: "acme/web", managerError: null });
    expect(readManagerMode(p)).toBe(true);
  }, GIT_TEST_MS);

  test("project new with manager without origin on GitHub still creates the project, leaves Manager mode off and says why", () => {
    const p = repo("https://gitlab.com/acme/web");
    const r = json(["--root", base, "project", "new", "--input", JSON.stringify({ manager: true })]);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ manager: false, managerRepository: null, managerError: MANAGER_NEEDS_GITHUB });
    expect(existsSync(join(p.dir, "model", "system.md"))).toBe(true);
    expect(readManagerMode(p)).toBe(false);
    expect(existsSync(join(p.dir, "manager"))).toBe(false);
  }, GIT_TEST_MS);

  test("project new without manager, or with false, leaves it off and silent", () => {
    repo("https://github.com/acme/web");
    const out = text(["project", "new", "--input", JSON.stringify({ manager: false })]);
    expect(out).not.toContain("Manager mode");
    expect(readManagerMode(projectAt(base))).toBe(false);
  }, GIT_TEST_MS);

  test("project new says that Manager mode is on, in the text too", () => {
    repo("https://github.com/acme/web");
    expect(text(["project", "new", "--input", JSON.stringify({ manager: true })])).toContain("Manager mode is on (acme/web).");
  }, GIT_TEST_MS);

  test("project new says why Manager mode was not turned on, in the text too", () => {
    repo(null);
    expect(text(["project", "new", "--input", JSON.stringify({ manager: true })])).toContain(`Manager mode was not turned on: ${MANAGER_NEEDS_GITHUB}`);
  }, GIT_TEST_MS);

  test("project edit with only manager writes only Manager mode and reinstalls no skill", () => {
    const p = repo("https://github.com/acme/web");
    text(["project", "new"]);
    const skill = join(base, ".agents", "skills", "trama-scan", "SKILL.md");
    writeFileSync(skill, "mine\n");
    const on = json(["--root", base, "project", "edit", "--input", JSON.stringify({ manager: true })]);
    expect(on.exit).toBe(0);
    expect(on.data).toMatchObject({ manager: true, managerRepository: "acme/web" });
    expect(on.data).not.toHaveProperty("changed");
    expect(readFileSync(skill, "utf8")).toBe("mine\n");
    expect(readManagerMode(p)).toBe(true);
    expect(text(["project", "edit", "--input", JSON.stringify({ manager: true })])).toBe("Manager mode is on (acme/web).");
    const off = json(["--root", base, "project", "edit", "--input", JSON.stringify({ manager: false })]);
    expect(off.data).toMatchObject({ manager: false, managerRepository: "acme/web" });
    expect(text(["project", "edit", "--input", JSON.stringify({ manager: false })])).toBe("Manager mode is off.");
    expect(readManagerMode(p)).toBe(false);
    expect(readFileSync(skill, "utf8")).toBe("mine\n");
  }, GIT_TEST_MS);

  test("project edit with manager true is refused without origin on GitHub, and writes nothing, not even Solo mode given with it", () => {
    const p = repo(null);
    text(["project", "new"]);
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ manager: true, solo: "folders" })]);
    expect(r.exit).not.toBe(0);
    expect(r.out).toContain(MANAGER_NEEDS_GITHUB);
    expect(readManagerMode(p)).toBe(false);
    expect(existsSync(join(p.dir, "solo"))).toBe(false);
  }, GIT_TEST_MS);

  test("project edit with manager false works without origin on GitHub, and deletes only the file", () => {
    const p = repo("https://github.com/acme/web");
    text(["project", "new", "--input", JSON.stringify({ manager: true })]);
    git(base, "remote", "remove", "origin");
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ manager: false })]);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ manager: false, managerRepository: null });
    expect(readManagerMode(p)).toBe(false);
    expect(existsSync(join(p.dir, "manager", ".gitignore"))).toBe(true);
  }, GIT_TEST_MS);

  test("project edit with manager and skillsDir also updates the skills", () => {
    const p = repo("https://github.com/acme/web");
    text(["project", "new"]);
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ manager: true, skillsDir: ".agents/skills" })]);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ manager: true, managerRepository: "acme/web" });
    expect(r.data).toHaveProperty("changed");
    expect(readManagerMode(p)).toBe(true);
  }, GIT_TEST_MS);

  test("project show prints the line and, with --json, the fields", () => {
    const p = repo("https://github.com/acme/web");
    text(["project", "new"]);
    expect(text(["project", "show"]).trimEnd().endsWith("Manager mode: off")).toBe(true);
    expect(json(["--root", base, "project", "show"]).data).toMatchObject({ manager: false, managerRepository: "acme/web", solo: "off" });
    setManagerMode(p, true);
    expect(text(["project", "show"]).trimEnd().endsWith("Manager mode: on (acme/web)")).toBe(true);
    expect(json(["--root", base, "project", "show"]).data).toMatchObject({ manager: true, managerRepository: "acme/web" });
    git(base, "remote", "set-url", "origin", "https://gitlab.com/acme/web");
    expect(text(["project", "show"]).trimEnd().endsWith("Manager mode: on, but origin is not on GitHub")).toBe(true);
    expect(json(["--root", base, "project", "show"]).data).toMatchObject({ manager: true, managerRepository: null });
    git(base, "remote", "remove", "origin");
    expect(json(["--root", base, "project", "show"]).data).toMatchObject({ manager: true, managerRepository: null });
  }, GIT_TEST_MS);
});
