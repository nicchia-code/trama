import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { SKILLS } from "../src/cli/skills";


test("init refuses to overwrite customised skill files and creates nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const custom = join(root, ".agents/skills/trama-scan/SKILL.md");
    mkdirSync(join(custom, ".."), { recursive: true });
    writeFileSync(custom, "my own scan skill\n");

    expect(() => run(["--root", root, "init"], root)).toThrow(/Refusing to overwrite[\s\S]*trama-scan\/SKILL\.md/);
    expect(readFileSync(custom, "utf8")).toBe("my own scan skill\n");
    expect(existsSync(join(root, ".trama"))).toBe(false);
    expect(existsSync(join(root, ".agents/skills/trama-design"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init and skills update install omp's two sub-agents on roles, never on a concrete model", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const triage = join(root, ".omp/agents/trama-triage.md");
    const analysis = join(root, ".omp/agents/trama-analysis.md");
    expect(readFileSync(triage, "utf8")).toMatch(/^---\nname: trama-triage\ndescription: ".+"\nmodel: "@smol"\n---\n\n.*trama-scan/);
    expect(readFileSync(analysis, "utf8")).toMatch(/^---\nname: trama-analysis\ndescription: ".+"\nmodel: "@slow"\n---\n\n.*trama-scan/);
    rmSync(join(root, ".omp"), { recursive: true });
    run(["--root", root, "skills", "update"], root);
    expect(existsSync(triage) && existsSync(analysis)).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init --force replaces customised skills, and identical existing files are not a conflict", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const design = join(root, ".agents/skills/trama-design/SKILL.md");
    const scan = join(root, ".agents/skills/trama-scan/SKILL.md");
    mkdirSync(join(design, ".."), { recursive: true });
    mkdirSync(join(scan, ".."), { recursive: true });
    writeFileSync(design, SKILLS["trama-design/SKILL.md"] as string); // same as ours: fine
    writeFileSync(scan, "custom\n");

    run(["--root", root, "init", "--force"], root);
    expect(readFileSync(scan, "utf8")).toBe(SKILLS["trama-scan/SKILL.md"] as string);
    expect(existsSync(join(root, ".trama/model/system.md"))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const same = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const design = join(same, ".agents/skills/trama-design/SKILL.md");
    mkdirSync(join(design, ".."), { recursive: true });
    writeFileSync(design, SKILLS["trama-design/SKILL.md"] as string);
    expect(run(["--root", same, "init"], same).exit).toBe(0);
  } finally {
    rmSync(same, { recursive: true, force: true });
  }
});

test("skills update deletes the retired trama-fix folder from every skill folder, reports it, and finds nothing the second time", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const fixes = [".agents/skills", ".claude/skills", "tools/agent-skills"].map((d) => join(root, d, "trama-fix"));
    for (const fix of fixes) {
      mkdirSync(join(fix, "notes"), { recursive: true });
      writeFileSync(join(fix, "SKILL.md"), "old fix skill\n");
      writeFileSync(join(fix, "notes/mine.md"), "customised\n");
    }

    const first = run(["--root", root, "skills", "update", "--skills-dir", "tools/agent-skills"], root).out;
    for (const fix of fixes) {
      expect(existsSync(fix)).toBe(false);
      expect(first).toContain(fix);
    }
    expect(existsSync(join(root, ".agents/skills/trama-design/SKILL.md"))).toBe(true);

    expect(run(["--root", root, "skills", "update", "--skills-dir", "tools/agent-skills"], root).out).not.toContain("Deleted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("trama-implement reads each Task once from task show and checks the run once at the end", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  expect(skill).toContain("That text is the Model and the Requirements for this Task.");
  expect(skill).toContain("do not open a `trama-req-*` skill");
  expect(skill).toContain("run one command for that Transition, `trama state` or `trama event`, and do not resume the tour");
  expect(skill).toContain("After the code, do not read the Model again.");
  expect(skill).toContain("Do not run the project's full suite, the linter or the build after the Task.");
  expect(skill).toContain("A Task asked by name is its own run");
  expect(skill).toContain("If you cannot tell which Task broke the check, say so in the report and stop");
  expect(skill).not.toContain("load the `trama-req-");
  expect(skill).not.toContain("Understand the surroundings");
});

test("the four skills name cards by short number and title but write only the permanent identity", () => {
  for (const name of ["trama-design", "trama-scan", "trama-implement", "trama-import"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    expect(skill).toContain("## Naming cards");
    expect(skill).toContain("by short number and title");
    expect(skill).toContain("use **only the permanent identity**");
    expect(skill).toContain("**Never write a short number in a file**");
  }
});

test("the four skills say which texts follow the chosen language and which stay in English, without naming a language", () => {
  for (const name of ["trama-design", "trama-scan", "trama-implement", "trama-import"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    const section = skill.slice(skill.indexOf("## Language"), skill.indexOf("## Steps"));
    expect(section).toContain("only the prose you produce for Trama goes in that language");
    expect(section).toContain("the names and titles of Model elements, Requirements, Proposals, Tasks and Drifts");
    expect(section).toContain("the `(initial)` and `(final)` markers");
    expect(section).toContain("never translate the whole file");
    expect(section).not.toMatch(/Italian|French|German|Spanish/);
  }
});
