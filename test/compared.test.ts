import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { announce, listAnnouncements } from "../src/core/announcements";
import { archiveComparison } from "../src/core/compare";
import { codeFingerprint, comparedRefs, git, recordComparison, splitCompared, textFingerprint } from "../src/core/compared";
import { loadProject } from "../src/core/requirements";
import { type Project, projectAt } from "../src/core/store";
import { newTask } from "../src/core/work";
import { run } from "../src/cli/main";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const validComparison = JSON.stringify({ tasks: [{ title: "Refund paid orders", refs: ["order/Paid"] }], drifts: [] });

/** Makes the project folder a git repository with every file committed. */
function gitRepo(): void {
  const gitCmd = (...args: string[]) => {
    // Bounded, ended by SIGKILL at the bound, and without a terminal: a git that waits for input or a credential fails the test instead of hanging the run.
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
  };
  gitCmd("init", "-q");
  gitCmd("add", "-A");
  gitCmd("-c", "user.name=Trama", "-c", "user.email=trama@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "init");
}

/** The bound of a test that builds a git repository: above the bound of each git command, since a slow Windows runner takes seconds for one. */
const GIT_TEST_MS = 60_000;

describe("text fingerprint", () => {
  test("a text saved with CRLF line endings fingerprints like its LF version", () => {
    const lf = "# Order\n\nThe customer pays.\n";
    expect(textFingerprint(lf.replace(/\n/g, "\r\n"))).toBe(textFingerprint(lf));
  });
});

describe("code fingerprint", () => {
  test("is null outside git", () => {
    expect(codeFingerprint(dir)).toBeNull();
  });

  // A git that ignores SIGTERM is ended by SIGKILL at its bound, so the synchronous wait returns and the run goes on.
  (process.platform === "win32" ? test.skip : test)("a git that ignores SIGTERM is ended at its bound and reads as a failure", () => {
    const bin = mkdtempSync(join(tmpdir(), "trama-git-"));
    writeFileSync(join(bin, "git"), "#!/bin/sh\ntrap '' TERM\nwhile :; do :; done\n", { mode: 0o755 });
    const path = process.env.PATH ?? "";
    process.env.PATH = `${bin}${delimiter}${path}`;
    try {
      expect(git(dir, ["status"], 1000)).toBeNull();
    } finally {
      process.env.PATH = path;
      rmSync(bin, { recursive: true, force: true });
    }
  });

  test("changes with the content of a changed file, and ignores Trama's own folder", () => {
    gitRepo();
    const before = codeFingerprint(dir);
    expect(before).toMatch(/^[0-9a-f]{64}$/);
    writeFileSync(join(dir, "app.ts"), "export const x = 1;\n");
    const changed = codeFingerprint(dir);
    expect(changed).not.toBe(before);
    writeFileSync(join(dir, ".trama", "note.txt"), "not code");
    expect(codeFingerprint(dir)).toBe(changed);
  }, GIT_TEST_MS);

  test("leaves out the skill folder of Trama but counts the old agent folders as code", () => {
    gitRepo();
    const before = codeFingerprint(dir);
    mkdirSync(join(dir, ".agents", "skills", "x"), { recursive: true });
    writeFileSync(join(dir, ".agents", "skills", "x", "SKILL.md"), "skill");
    expect(codeFingerprint(dir)).toBe(before);
    for (const old of [".claude/skills", ".github/skills"]) {
      const base = codeFingerprint(dir);
      mkdirSync(join(dir, old), { recursive: true });
      writeFileSync(join(dir, old, "note.md"), old);
      expect(codeFingerprint(dir)).not.toBe(base);
    }
  }, GIT_TEST_MS);
});

describe("trama comparison new", () => {
  test("in git the announcement records the code fingerprint, the refs and each reference's text", () => {
    gitRepo();
    run(["--root", dir, "comparison", "new", "order"], dir, { TRAMA_TERMINAL: "abc123" });
    const [ghost] = listAnnouncements(p);
    expect(ghost?.code).toMatch(/^[0-9a-f]{64}$/);
    expect(ghost?.refs).toContain("order/Paid");
    expect(Object.keys(ghost?.texts ?? {})).toContain("order/Paid");
  }, GIT_TEST_MS);

  test("outside git the announcement records no code fingerprint", () => {
    run(["--root", dir, "comparison", "new", "order"], dir, { TRAMA_TERMINAL: "abc123" });
    const [ghost] = listAnnouncements(p);
    expect(ghost?.code).toBeNull();
    expect(ghost?.texts).toEqual({});
  });
});

describe("trama comparison move and the registry", () => {
  test("a successful comparison file records every reference it covered under the code fingerprint", () => {
    gitRepo();
    run(["--root", dir, "comparison", "new", "order"], dir, { TRAMA_TERMINAL: "abc123" });
    const [ghost] = listAnnouncements(p);
    archiveComparison(p, ghost?.id ?? "", validComparison);
    const recorded = comparedRefs(p, ghost?.code ?? "");
    expect(Object.keys(recorded)).toEqual(expect.arrayContaining(["order", "order/Paid"]));
    expect(existsSync(join(p.dir, "compared", ".gitignore"))).toBe(true);
  }, GIT_TEST_MS);

  test("a comparison without a code fingerprint, or not waiting, records nothing", () => {
    const plain = announce(p, { kind: "comparison", title: "Comparing order", machine: "order" });
    archiveComparison(p, plain.id, validComparison);
    archiveComparison(p, "zzzzzz", validComparison);
    expect(existsSync(join(p.dir, "compared"))).toBe(false);
  });

  test("a new code fingerprint replaces the fingerprints recorded before", () => {
    recordComparison(p, "a".repeat(64), { order: "1" });
    recordComparison(p, "b".repeat(64), { order: "2" });
    expect(readdirSync(join(p.dir, "compared")).sort()).toEqual([".gitignore", `${"b".repeat(64)}.json`]);
  });

  test("a reference is already compared only when it or a container was recorded with the same text", () => {
    const project = loadProject(p);
    const code = "c".repeat(64);
    recordComparison(p, code, { "order/Paid": "same" });
    expect(splitCompared(p, project, ["order/Paid", "order/Shipped"], code, () => "same")).toEqual({ remaining: ["order/Shipped"], already: ["order/Paid"] });
    expect(splitCompared(p, project, ["order/Paid"], code, () => "changed").remaining).toEqual(["order/Paid"]);
    expect(splitCompared(p, project, ["order/Paid"], null, () => "same").remaining).toEqual(["order/Paid"]);
    recordComparison(p, code, { order: "same" });
    expect(splitCompared(p, project, ["order/Paid"], code, () => "same").already).toEqual(["order/Paid"]);
  });
});

describe("trama task list with runnable and scope", () => {
  test("lists the references already compared, and leaves them out of the references to check", () => {
    gitRepo();
    run(["--root", dir, "comparison", "new", "order"], dir, { TRAMA_TERMINAL: "abc123" });
    const [ghost] = listAnnouncements(p);
    archiveComparison(p, ghost?.id ?? "", validComparison);
    newTask(p, { title: "Refund paid orders", refs: ["order/Paid"], technical: false });
    const out = run(["--root", dir, "task", "list", "--input", '{"runnable":true,"scope":true}'], dir, {}).out;
    expect(out).toContain("## Already compared\n\n- `order/Paid`");
    expect(out).toContain("## Pre-flight scope\n\n_Nothing to check._");
  }, GIT_TEST_MS);
});
