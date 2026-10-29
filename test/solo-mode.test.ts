import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { refreshProjectSkills } from "../src/cli/skill-refresh";
import { TramaError } from "../src/core/errors";
import {
  currentSolo,
  currentSoloAsync,
  expectedSoloBlockAsync,
  findSoloBlock,
  projectSkillsFolder,
  readSoloMode,
  removeSoloBlock,
  repairSoloBlock,
  repairSoloBlockAsync,
  replaceSoloBlock,
  SOLO_BEGIN,
  SOLO_END,
  SOLO_NEEDS_GIT,
  setSoloMode,
  setSoloModeAsync,
  soloBlock,
  soloFile,
  soloStatusAsync,
  trackedSoloFiles,
  trackedSoloFilesAsync,
} from "../src/core/solo-mode";
import { type Project, projectAt } from "../src/core/store";

const GIT_TEST_MS = 60_000;

let base: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "trama-solo-"));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, killSignal: "SIGKILL", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (r.error !== undefined || r.status !== 0) throw new Error(r.error?.message ?? r.stderr);
  return r.stdout;
}

/** A git repository in `base`, and a project at `sub` inside it (the repository itself when empty). */
function repoWithProject(sub = ""): { repo: string; root: string; p: Project; exclude: string } {
  git(base, "init", "-q");
  const root = sub === "" ? base : join(base, sub);
  mkdirSync(root, { recursive: true });
  // git init writes a template of comments; an empty file makes the expected texts plain.
  const exclude = join(base, ".git", "info", "exclude");
  writeFileSync(exclude, "");
  return { repo: base, root, p: projectAt(root), exclude };
}

const ignored = (cwd: string, path: string): boolean => spawnSync("git", ["check-ignore", "-q", path], { cwd }).status === 0;
const write = (path: string, text = "x\n"): void => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

describe("the block", () => {
  test("folders keeps out .trama, the skills folder and .omp, anchored to the repository root", () => {
    expect(soloBlock("folders", "")).toEqual([SOLO_BEGIN, "/.trama/", "/.agents/skills/", "/.omp/", SOLO_END]);
  });

  test("files keeps out only what Trama writes: the trama-* skills, its two agents and the watchdog", () => {
    expect(soloBlock("files", "")).toEqual([SOLO_BEGIN, "/.trama/", "/.agents/skills/trama-*/", "/.omp/agents/trama-analysis.md", "/.omp/agents/trama-implementer.md", "/.omp/WATCHDOG.yml", SOLO_END]);
  });

  test("the prefix of the project in the repository and a custom skills folder are in every path", () => {
    expect(soloBlock("folders", "packages/app/", "tools/skills")).toEqual([SOLO_BEGIN, "/packages/app/.trama/", "/packages/app/tools/skills/", "/packages/app/.omp/", SOLO_END]);
    expect(soloBlock("files", "packages/app/", "tools/skills")).toContain("/packages/app/tools/skills/trama-*/");
  });

  test("a skills folder outside the project is left out", () => {
    expect(soloBlock("folders", "", null)).toEqual([SOLO_BEGIN, "/.trama/", "/.omp/", SOLO_END]);
    expect(projectSkillsFolder("/work/app", "../skills")).toBeNull();
    expect(projectSkillsFolder("/work/app", "/elsewhere/skills")).toBeNull();
    expect(projectSkillsFolder("/work/app", "/work/app/agent/skills")).toBe("agent/skills");
    expect(projectSkillsFolder("/work/app", undefined)).toBe(".agents/skills");
    expect(projectSkillsFolder("/work/app", "./custom/skills/")).toBe("custom/skills");
  });

  test("wildcard characters of a path are escaped, so they match themselves", () => {
    expect(soloBlock("folders", "a*b/", "s[1]")).toContain("/a\\*b/s\\[1]/");
  });
});

describe("the text of the exclusion file", () => {
  const block = soloBlock("folders", "");

  test("the block is appended after the other lines, which stay as they are", () => {
    expect(replaceSoloBlock("# git\n*.log\n", block)).toBe(`# git\n*.log\n${block.join("\n")}\n`);
    expect(replaceSoloBlock("", block)).toBe(`${block.join("\n")}\n`);
  });

  test("a last line without a line end gets one, in the style of the file", () => {
    expect(replaceSoloBlock("*.log", block)).toBe(`*.log\n${block.join("\n")}\n`);
    expect(replaceSoloBlock("*.log", block)).not.toContain("\r");
    expect(replaceSoloBlock("*.log\r\n*.tmp", block)).toBe(`*.log\r\n*.tmp\r\n${block.join("\r\n")}\r\n`);
  });

  test("a block of another kind is replaced in place, keeping the lines around it and the CRLF", () => {
    const text = `a\r\n${soloBlock("files", "").join("\r\n")}\r\nb\r\n`;
    expect(replaceSoloBlock(text, block)).toBe(`a\r\n${block.join("\r\n")}\r\nb\r\n`);
  });

  test("a block at the end without a line end stays without one", () => {
    const text = `a\n${soloBlock("files", "").join("\n")}`;
    expect(replaceSoloBlock(text, block)).toBe(`a\n${block.join("\n")}`);
  });

  test("the same block leaves the text byte-identical, whatever its line endings", () => {
    for (const eol of ["\n", "\r\n"]) {
      for (const text of [`x${eol}${block.join(eol)}${eol}y${eol}`, `x${eol}${block.join(eol)}${eol}`, `x${eol}${block.join(eol)}`]) expect(replaceSoloBlock(text, block)).toBe(text);
    }
    const mixed = `a\r\n${block.join("\n")}\nb`;
    expect(replaceSoloBlock(mixed, block)).toBe(mixed);
  });

  test("the block is found and removed with nothing else changed", () => {
    const text = `a\r\n${block.join("\r\n")}\r\nb`;
    expect(findSoloBlock(text)).toEqual(block);
    expect(removeSoloBlock(text)).toBe("a\r\nb");
    expect(removeSoloBlock(`${block.join("\n")}\n`)).toBe("");
    expect(removeSoloBlock("a\nb\n")).toBe("a\nb\n");
    expect(findSoloBlock("a\n")).toBeNull();
  });

  test("a begin marker without an end is no block, and the last begin before the end starts it", () => {
    expect(findSoloBlock(`${SOLO_BEGIN}\n/x/\n`)).toBeNull();
    expect(replaceSoloBlock(`${SOLO_BEGIN}\n`, block)).toBe(`${SOLO_BEGIN}\n${block.join("\n")}\n`);
    expect(findSoloBlock(`${SOLO_BEGIN}\n${SOLO_BEGIN}\n/a/\n${SOLO_END}\n`)).toEqual([SOLO_BEGIN, "/a/", SOLO_END]);
  });
});

describe("the mode file", () => {
  test("absent is off; a file that is not valid is on with folders", () => {
    const p = projectAt(base);
    expect(readSoloMode(p)).toBe("off");
    for (const bad of ["", "not json", "[]", "{}", '{"exclusions":"all"}', '{"exclusions":3}', "null"]) {
      write(soloFile(p), bad);
      expect(readSoloMode(p)).toBe("folders");
    }
    write(soloFile(p), '{"exclusions":"files"}');
    expect(readSoloMode(p)).toBe("files");
    write(soloFile(p), '{ "exclusions": "folders" }\n');
    expect(readSoloMode(p)).toBe("folders");
  });
});

describe("turning Solo mode on, changing it and turning it off", () => {
  test("on writes the mode file, its own .gitignore and the block, and git ignores Trama's files", () => {
    const { p, exclude } = repoWithProject();
    write(exclude, "# git\n*.log\n");
    expect(setSoloMode(p, "folders")).toEqual({ solo: "folders", tracked: [] });
    expect(JSON.parse(readFileSync(soloFile(p), "utf8"))).toEqual({ exclusions: "folders" });
    expect(readFileSync(join(p.dir, "solo", ".gitignore"), "utf8")).toBe("*\n");
    expect(readFileSync(exclude, "utf8")).toBe(`# git\n*.log\n${soloBlock("folders", "").join("\n")}\n`);
    write(join(p.dir, "model", "system.md"));
    write(join(base, ".omp", "agents", "other.md"));
    write(join(base, ".agents", "skills", "any", "SKILL.md"));
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("");
    expect(readSoloMode(p)).toBe("folders");
  }, GIT_TEST_MS);

  test("files ignores only the files Trama writes", () => {
    const { p } = repoWithProject();
    setSoloMode(p, "files");
    write(join(p.dir, "model", "system.md"));
    write(join(base, ".agents", "skills", "trama-scan", "SKILL.md"));
    write(join(base, ".agents", "skills", "trama-req-ui", "SKILL.md"));
    write(join(base, ".agents", "skills", "mine", "SKILL.md"));
    write(join(base, ".omp", "agents", "trama-analysis.md"));
    write(join(base, ".omp", "agents", "trama-implementer.md"));
    write(join(base, ".omp", "WATCHDOG.yml"));
    write(join(base, ".omp", "agents", "mine.md"));
    expect(git(base, "status", "--porcelain", "--untracked-files=all").trim().split("\n")).toEqual(["?? .agents/skills/mine/SKILL.md", "?? .omp/agents/mine.md"]);
  }, GIT_TEST_MS);

  test("a project in a subfolder gets its own prefix, and the exclusions work from the repository root", async () => {
    const { p, exclude } = repoWithProject("packages/app");
    setSoloMode(p, "folders", "tools/skills");
    expect(readFileSync(exclude, "utf8")).toBe(`${soloBlock("folders", "packages/app/", "tools/skills").join("\n")}\n`);
    write(join(p.dir, "model", "system.md"));
    write(join(p.root, "tools", "skills", "a", "SKILL.md"));
    write(join(p.root, ".omp", "WATCHDOG.yml"));
    write(join(p.root, "src", "code.ts"));
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("?? packages/app/src/code.ts\n");
    expect(await expectedSoloBlockAsync(p, "files")).toEqual(soloBlock("files", "packages/app/", ".agents/skills"));
  }, GIT_TEST_MS);

  test("files of Trama git already tracks do not prevent it and come back as tracked", async () => {
    const { p } = repoWithProject();
    write(join(p.dir, "model", "system.md"));
    write(join(base, ".agents", "skills", "trama-scan", "SKILL.md"));
    write(join(base, ".agents", "skills", "mine", "SKILL.md"));
    write(join(base, ".omp", "agents", "mine.md"));
    git(base, "add", "-A");
    git(base, "-c", "user.name=T", "-c", "user.email=t@e.x", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "init");
    expect(setSoloMode(p, "folders")).toEqual({ solo: "folders", tracked: [".agents/skills/mine/SKILL.md", ".agents/skills/trama-scan/SKILL.md", ".omp/agents/mine.md", ".trama/model/system.md"] });
    expect(setSoloMode(p, "files")).toEqual({ solo: "files", tracked: [".agents/skills/trama-scan/SKILL.md", ".trama/model/system.md"] });
    expect(trackedSoloFiles(p, "files")).toEqual([".agents/skills/trama-scan/SKILL.md", ".trama/model/system.md"]);
    expect(currentSolo(p)).toEqual({ solo: "files", tracked: [".agents/skills/trama-scan/SKILL.md", ".trama/model/system.md"] });
    // The asynchronous forms of the editor's host answer the same.
    expect(await trackedSoloFilesAsync(p, "files")).toEqual(trackedSoloFiles(p, "files"));
    expect(await currentSoloAsync(p)).toEqual(currentSolo(p));
    // The mode file is not tracked even though .trama/ is: it has a .gitignore of its own.
    expect(git(base, "ls-files", ".trama/solo")).toBe("");
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("");
  }, GIT_TEST_MS);

  test("changing the kind rewrites the file and the block, leaving the other lines", () => {
    const { p, exclude } = repoWithProject();
    write(exclude, "*.log\r\n");
    setSoloMode(p, "folders");
    const result = setSoloMode(p, "files");
    expect(result.solo).toBe("files");
    expect(readSoloMode(p)).toBe("files");
    expect(readFileSync(exclude, "utf8")).toBe(`*.log\r\n${soloBlock("files", "").join("\r\n")}\r\n`);
  }, GIT_TEST_MS);

  test("turning it on again with the same kind changes no byte", () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "files");
    const text = readFileSync(exclude);
    const mode = readFileSync(soloFile(p));
    setSoloMode(p, "files");
    expect(readFileSync(exclude).equals(text)).toBe(true);
    expect(readFileSync(soloFile(p)).equals(mode)).toBe(true);
  }, GIT_TEST_MS);

  test("off removes the block and the file, and nothing else", () => {
    const { p, exclude } = repoWithProject();
    write(exclude, "*.log");
    setSoloMode(p, "folders");
    expect(setSoloMode(p, "off")).toEqual({ solo: "off", tracked: [] });
    expect(readFileSync(exclude, "utf8")).toBe("*.log\n");
    expect(existsSync(soloFile(p))).toBe(false);
    expect(readSoloMode(p)).toBe("off");
    expect(setSoloMode(p, "off")).toEqual({ solo: "off", tracked: [] });
  }, GIT_TEST_MS);

  test("outside git it refuses with the reason and writes nothing; off still removes the file", async () => {
    const p = projectAt(base);
    expect(() => setSoloMode(p, "folders")).toThrow(new TramaError(SOLO_NEEDS_GIT));
    expect(() => setSoloMode(p, "files")).toThrow("Solo mode needs a git repository.");
    expect(existsSync(p.dir)).toBe(false);
    write(soloFile(p), '{"exclusions":"files"}');
    expect(setSoloMode(p, "off")).toEqual({ solo: "off", tracked: [] });
    expect(existsSync(soloFile(p))).toBe(false);
    expect(await soloStatusAsync(p)).toEqual({ available: false, solo: "off", tracked: [] });
    await expect(setSoloModeAsync(p, "folders")).rejects.toThrow(new TramaError(SOLO_NEEDS_GIT));
  }, GIT_TEST_MS);

  test("the status says whether git is there, the kind and the tracked files", async () => {
    const { p } = repoWithProject();
    expect(await soloStatusAsync(p)).toEqual({ available: true, solo: "off", tracked: [] });
    setSoloMode(p, "folders");
    expect(await soloStatusAsync(p)).toEqual({ available: true, solo: "folders", tracked: [] });
  }, GIT_TEST_MS);

  test("the asynchronous write gives the same files and the same result as the synchronous one", async () => {
    const { p, exclude } = repoWithProject();
    write(exclude, "*.log\n");
    expect(await setSoloModeAsync(p, "folders")).toEqual(setSoloMode(p, "folders"));
    const written = readFileSync(exclude, "utf8");
    expect(findSoloBlock(written)).toEqual(soloBlock("folders", ""));
    expect(await setSoloModeAsync(p, "off")).toEqual({ solo: "off", tracked: [] });
    expect(readFileSync(exclude, "utf8")).toBe("*.log\n");
    expect(existsSync(soloFile(p))).toBe(false);
  }, GIT_TEST_MS);

  test("the asynchronous repair writes the block again like the synchronous one", async () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "folders");
    write(exclude, "");
    expect(await repairSoloBlockAsync(p)).toBe(true);
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", ""));
    expect(await repairSoloBlockAsync(p)).toBe(false);
  }, GIT_TEST_MS);

  (process.platform === "win32" ? test.skip : test)("a write that fails changes nothing and says why", () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "folders");
    const before = readFileSync(exclude, "utf8");
    const mode = readFileSync(soloFile(p), "utf8");
    // The mode file cannot be replaced: its folder is read-only; the exclusion file written first goes back as it was.
    chmodSync(join(p.dir, "solo"), 0o555);
    try {
      if (process.getuid?.() === 0) return;
      expect(() => setSoloMode(p, "files")).toThrow(/Could not write .*mode\.json/);
      expect(readFileSync(exclude, "utf8")).toBe(before);
      expect(readFileSync(soloFile(p), "utf8")).toBe(mode);
    } finally {
      chmodSync(join(p.dir, "solo"), 0o755);
    }
  }, GIT_TEST_MS);
});

describe("the repair", () => {
  test("writes the block again when it is missing or different, and says nothing when it is right", () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "folders");
    expect(repairSoloBlock(p)).toBe(false);
    write(exclude, "*.log\n");
    expect(repairSoloBlock(p)).toBe(true);
    expect(readFileSync(exclude, "utf8")).toBe(`*.log\n${soloBlock("folders", "").join("\n")}\n`);
    expect(repairSoloBlock(p)).toBe(false);
    write(exclude, `${soloBlock("files", "").join("\n")}\n`);
    expect(repairSoloBlock(p)).toBe(true);
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", ""));
  }, GIT_TEST_MS);

  test("follows the skills folder it is given", () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "folders");
    expect(repairSoloBlock(p, "agent/skills")).toBe(true);
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", "", "agent/skills"));
  }, GIT_TEST_MS);

  test("recreates a missing exclusion file, and does nothing when Solo mode is off or git is absent", () => {
    const { p, exclude } = repoWithProject();
    expect(repairSoloBlock(p)).toBe(false);
    expect(findSoloBlock(existsSync(exclude) ? readFileSync(exclude, "utf8") : "")).toBeNull();
    setSoloMode(p, "files");
    rmSync(exclude);
    expect(repairSoloBlock(p)).toBe(true);
    expect(readFileSync(exclude, "utf8")).toBe(`${soloBlock("files", "").join("\n")}\n`);
    const outside = mkdtempSync(join(tmpdir(), "trama-nogit-"));
    try {
      const q = projectAt(outside);
      write(soloFile(q), '{"exclusions":"folders"}');
      expect(repairSoloBlock(q)).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  }, GIT_TEST_MS);

  test("an invalid mode file repairs as folders", () => {
    const { p, exclude } = repoWithProject();
    write(soloFile(p), "broken");
    expect(repairSoloBlock(p)).toBe(true);
    expect(readFileSync(exclude, "utf8")).toBe(`${soloBlock("folders", "").join("\n")}\n`);
  }, GIT_TEST_MS);

  test("the skills refresh of the opening repairs the block, and a failed write fails the refresh", () => {
    const { p, exclude } = repoWithProject();
    setSoloMode(p, "folders");
    write(exclude, "");
    refreshProjectSkills(p, undefined, false);
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", ""));
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    write(exclude, "");
    chmodSync(exclude, 0o444);
    try {
      expect(() => refreshProjectSkills(p, undefined, false)).toThrow(/Could not write .*exclude/);
    } finally {
      chmodSync(exclude, 0o644);
    }
  }, GIT_TEST_MS);
});

describe("trama project new and edit with solo", () => {
  const json = (argv: string[], cwd: string): { exit: number; data: Record<string, unknown>; out: string } => {
    let r: { out: string; exit: number };
    try {
      r = run([...argv, "--json"], cwd, {});
    } catch (error) {
      // The command line's own entry turns these into the exit code; here the refusal is the message.
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

  test("project new with solo in git writes Solo mode first and reports it", () => {
    const { exclude } = repoWithProject();
    const r = json(["--root", base, "project", "new", "--input", JSON.stringify({ solo: "folders" })], base);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ solo: "folders", tracked: [] });
    expect(readSoloMode(projectAt(base))).toBe("folders");
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", ""));
    expect(git(base, "status", "--porcelain", "--untracked-files=all")).toBe("");
  }, GIT_TEST_MS);

  test("project new with solo outside git refuses and creates nothing", () => {
    const r = json(["--root", base, "project", "new", "--input", JSON.stringify({ solo: "files" })], base);
    expect(r.exit).not.toBe(0);
    expect(r.out).toContain("Solo mode needs a git repository.");
    expect(existsSync(join(base, ".trama"))).toBe(false);
    expect(existsSync(join(base, ".agents"))).toBe(false);
    expect(existsSync(join(base, ".omp"))).toBe(false);
  }, GIT_TEST_MS);

  test("project new without solo, or with off, reports off", () => {
    const r = json(["--root", base, "project", "new", "--input", JSON.stringify({ solo: "off" })], base);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ solo: "off", tracked: [] });
    expect(existsSync(soloFile(projectAt(base)))).toBe(false);
  }, GIT_TEST_MS);

  test("project edit with solo alone changes only Solo mode and installs no skills", () => {
    const { exclude } = repoWithProject();
    json(["--root", base, "project", "new"], base);
    rmSync(join(base, ".agents"), { recursive: true, force: true });
    const on = json(["--root", base, "project", "edit", "--input", JSON.stringify({ solo: "files" })], base);
    expect(on.exit).toBe(0);
    expect(on.data).toEqual({ solo: "files", tracked: [] });
    expect(existsSync(join(base, ".agents"))).toBe(false);
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("files", ""));
    const off = json(["--root", base, "project", "edit", "--input", JSON.stringify({ solo: "off" })], base);
    expect(off.data).toEqual({ solo: "off", tracked: [] });
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toBeNull();
    expect(existsSync(soloFile(projectAt(base)))).toBe(false);
  }, GIT_TEST_MS);

  test("project edit with solo and skillsDir makes the block cover that folder and installs the skills there", () => {
    const { exclude } = repoWithProject();
    json(["--root", base, "project", "new"], base);
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ solo: "folders", skillsDir: "agent/skills" })], base);
    expect(r.exit).toBe(0);
    expect(r.data).toMatchObject({ solo: "folders" });
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("folders", "", "agent/skills"));
    expect(existsSync(join(base, "agent", "skills", "trama-scan", "SKILL.md"))).toBe(true);
  }, GIT_TEST_MS);

  test("project edit with solo outside git refuses", () => {
    json(["--root", base, "project", "new"], base);
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ solo: "folders" })], base);
    expect(r.exit).not.toBe(0);
    expect(r.out).toContain("Solo mode needs a git repository.");
    expect(existsSync(soloFile(projectAt(base)))).toBe(false);
  }, GIT_TEST_MS);

  test("project edit without solo reports the Solo mode now, and project show carries it", () => {
    const { exclude } = repoWithProject();
    json(["--root", base, "project", "new", "--input", JSON.stringify({ solo: "files" })], base);
    write(exclude, "");
    const edit = json(["--root", base, "project", "edit"], base);
    expect(edit.data).toMatchObject({ solo: "files", tracked: [] });
    // The refresh repaired the block.
    expect(findSoloBlock(readFileSync(exclude, "utf8"))).toEqual(soloBlock("files", ""));
    expect(json(["--root", base, "project", "show"], base).data).toMatchObject({ solo: "files" });
  }, GIT_TEST_MS);

  test("project show reports off when Solo mode was never turned on", () => {
    json(["--root", base, "project", "new"], base);
    expect(json(["--root", base, "project", "show"], base).data).toMatchObject({ solo: "off" });
  }, GIT_TEST_MS);

  test("an unknown kind is a usage error and nothing changes", () => {
    json(["--root", base, "project", "new"], base);
    const r = json(["--root", base, "project", "edit", "--input", JSON.stringify({ solo: "all" })], base);
    expect(r.exit).not.toBe(0);
    expect(existsSync(soloFile(projectAt(base)))).toBe(false);
  }, GIT_TEST_MS);
});

test("git agrees with the anchored patterns", () => {
  const { p } = repoWithProject("packages/app");
  setSoloMode(p, "folders");
  expect(ignored(p.root, ".trama/model/system.md")).toBe(true);
  expect(ignored(base, "packages/app/.trama/model/system.md")).toBe(true);
  // Anchored: the same name elsewhere in the repository is not kept out.
  expect(ignored(base, "other/.trama/model/system.md")).toBe(false);
  expect(ignored(base, "packages/app/src/.omp/x")).toBe(false);
}, GIT_TEST_MS);
