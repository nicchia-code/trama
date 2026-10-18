import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { announce, listAnnouncements } from "../src/core/announcements";
import { archiveComparison } from "../src/core/compare";
import { codeFingerprint, comparedRefs, recordComparison, splitCompared, textFingerprint } from "../src/core/compared";
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
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
  };
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=Trama", "-c", "user.email=trama@example.com", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "init");
}

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

  test("changes with the content of a changed file, and ignores Trama's own folder", () => {
    gitRepo();
    const before = codeFingerprint(dir);
    expect(before).toMatch(/^[0-9a-f]{64}$/);
    writeFileSync(join(dir, "app.ts"), "export const x = 1;\n");
    const changed = codeFingerprint(dir);
    expect(changed).not.toBe(before);
    writeFileSync(join(dir, ".trama", "note.txt"), "not code");
    expect(codeFingerprint(dir)).toBe(changed);
  });
});

describe("trama compare brief", () => {
  test("in git the announcement records the code fingerprint, the refs and each reference's text", () => {
    gitRepo();
    run(["--root", dir, "compare", "brief", "order"], dir, {});
    const [ghost] = listAnnouncements(p);
    expect(ghost?.code).toMatch(/^[0-9a-f]{64}$/);
    expect(ghost?.refs).toContain("order/Paid");
    expect(Object.keys(ghost?.texts ?? {})).toContain("order/Paid");
  });

  test("outside git the announcement records no code fingerprint", () => {
    run(["--root", dir, "compare", "brief", "order"], dir, {});
    const [ghost] = listAnnouncements(p);
    expect(ghost?.code).toBeNull();
    expect(ghost?.texts).toEqual({});
  });
});

describe("trama compare file and the registry", () => {
  test("a successful comparison file records every reference it covered under the code fingerprint", () => {
    gitRepo();
    run(["--root", dir, "compare", "brief", "order"], dir, {});
    const [ghost] = listAnnouncements(p);
    archiveComparison(p, ghost?.id ?? "", validComparison);
    const recorded = comparedRefs(p, ghost?.code ?? "");
    expect(Object.keys(recorded)).toEqual(expect.arrayContaining(["order", "order/Paid"]));
    expect(existsSync(join(p.dir, "compared", ".gitignore"))).toBe(true);
  });

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

describe("trama task scope --pre-flight", () => {
  test("lists the references already compared, and leaves them out of the references to check", () => {
    gitRepo();
    run(["--root", dir, "compare", "brief", "order"], dir, {});
    const [ghost] = listAnnouncements(p);
    archiveComparison(p, ghost?.id ?? "", validComparison);
    newTask(p, { title: "Refund paid orders", refs: ["order/Paid"], technical: false });
    const out = run(["--root", dir, "task", "scope", "--pre-flight"], dir, {}).out;
    expect(out).toContain("## Already compared\n\n- `order/Paid`");
    expect(out).toContain("## Pre-flight scope\n\n_Nothing to check._");
  });
});
