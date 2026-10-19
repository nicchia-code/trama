import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { ADVISOR_INSTRUCTIONS, watchdogFile } from "../src/core/advisors";
import { parse } from "yaml";
import { ompAgentConflicts, SKILLS, skillConflicts } from "../src/cli/skills";


test("init refuses to overwrite customised skill files and creates nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const custom = join(root, ".agents/skills/trama-scan/SKILL.md");
    mkdirSync(join(custom, ".."), { recursive: true });
    writeFileSync(custom, "my own scan skill\n");

    expect(() => run(["--root", root, "init"], root)).toThrow(/Refusing to overwrite[\s\S]*trama-scan[\\/]SKILL\.md/);
    expect(readFileSync(custom, "utf8")).toBe("my own scan skill\n");
    expect(existsSync(join(root, ".trama"))).toBe(false);
    expect(existsSync(join(root, ".agents/skills/trama-design"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init and skills update install the analysis sub-agent on its role, never on a concrete model", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const analysis = join(root, ".omp/agents/trama-analysis.md");
    expect(readFileSync(analysis, "utf8")).toMatch(/^---\nname: trama-analysis\ndescription: ".+"\nmodel: "@slow"\n---\n\n.*trama-scan/);
    rmSync(join(root, ".omp"), { recursive: true });
    run(["--root", root, "skills", "update"], root);
    expect(existsSync(analysis)).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("init ignores retired omp triage files but still refuses customised analysis definitions", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const triage = join(root, ".omp/agents/trama-triage.md");
    mkdirSync(join(triage, ".."), { recursive: true });
    writeFileSync(triage, "custom triage\n");
    expect(run(["--root", root, "init"], root).exit).toBe(0);
    expect(readFileSync(triage, "utf8")).toBe("custom triage\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const root2 = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const analysis = join(root2, ".omp/agents/trama-analysis.md");
    mkdirSync(join(analysis, ".."), { recursive: true });
    writeFileSync(analysis, "custom analysis\n");
    expect(() => run(["--root", root2, "init"], root2)).toThrow(/trama-analysis\.md/);
    expect(existsSync(join(root2, ".trama"))).toBe(false);
  } finally {
    rmSync(root2, { recursive: true, force: true });
  }
});

test("init writes the advisor WATCHDOG file, blocks on a customised copy, and update replaces it", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const watchdog = join(root, ".omp/WATCHDOG.yml");
    const parsed = parse(readFileSync(watchdog, "utf8"));
    expect(parsed.instructions).toEqual(ADVISOR_INSTRUCTIONS);
    expect(parsed.advisors).toEqual([
      { name: "Trama turn reviewer", reviewMode: "turn", syncBacklog: "off", tools: ["read", "grep", "glob", "bash"] },
      { name: "Trama final reviewer", reviewMode: "agent-end", syncBacklog: "strict", tools: ["read", "grep", "glob", "bash"] },
    ]);
    expect(ompAgentConflicts(root)).toEqual([]);

    writeFileSync(watchdog, "custom watchdog\n");
    expect(ompAgentConflicts(root)).toEqual([watchdog]);
    const blocked = mkdtempSync(join(tmpdir(), "trama-skills-"));
    try {
      mkdirSync(join(blocked, ".omp"), { recursive: true });
      writeFileSync(join(blocked, ".omp/WATCHDOG.yml"), "custom watchdog\n");
      expect(() => run(["--root", blocked, "init"], blocked)).toThrow(/WATCHDOG\.yml/);
      expect(existsSync(join(blocked, ".trama"))).toBe(false);
    } finally {
      rmSync(blocked, { recursive: true, force: true });
    }

    run(["--root", root, "skills", "update"], root);
    expect(readFileSync(watchdog, "utf8")).toBe(watchdogFile());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skills update deletes obsolete omp triage definition regardless of content and reports it", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const triage = join(root, ".omp/agents/trama-triage.md");
    writeFileSync(triage, "custom triage\n");
    const result = run(["--root", root, "skills", "update"], root);
    expect(existsSync(triage)).toBe(false);
    expect(result.out).toContain(`Deleted the retired omp sub-agent definition: ${triage}`);
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
    for (const fix of fixes) expect(existsSync(fix)).toBe(false);
    expect(first).toContain("Deleted the retired trama-fix skill:");
    const second = run(["--root", root, "skills", "update", "--skills-dir", "tools/agent-skills"], root).out;
    expect(second).not.toContain("Deleted the retired trama-fix skill:");
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

test("trama-implement runs the pre-flight scan before the first Task, and its failure does not stop the Run", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  const steps = skill.slice(skill.indexOf("## Steps"));
  expect(steps.indexOf("**Pre-flight, before the first Task.**")).toBeGreaterThan(-1);
  expect(steps.indexOf("**Pre-flight, before the first Task.**")).toBeLessThan(steps.indexOf("1. **Pick the Task.**"));
  expect(skill).toContain("`trama task scope --pre-flight`");
  expect(skill).toContain("`trama announce check \"<title>\" --phase scanning`");
  expect(skill).toContain("Pre-flight scan failed: the Run continues without it.");
  expect(skill).toContain("file only Drifts with no origin (no `--task`)");
  expect(skill).toContain("never to file a Task, announce a check or run `trama task next`");
  expect(skill).toContain("**Proposal filters.**");
  expect(skill).toContain("`--not-proposal <id>`");
});

test("trama-implement writes History after the check and before the report, and only for runs that moved Tasks to Done", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  const steps = skill.slice(skill.indexOf("## Steps"));
  const history = steps.indexOf("8. **Write History.**");
  expect(history).toBeGreaterThan(steps.indexOf("7. **Scan the completed Tasks' scope.**"));
  expect(history).toBeLessThan(steps.indexOf("9. **Report.**"));
  expect(skill).toContain("`trama announce phase <id> history`");
  expect(skill).toContain("`trama history list --json`");
  expect(skill).toContain("`trama history show <id> --json`");
  expect(skill).toContain("`trama history update <id> --task <id>`");
  expect(skill).toContain("`trama history add \"<title>\" --summary \"<text>\" --body \"<text>\" --task <id>`");
  expect(skill).toContain("a sub-agent never writes them");
  expect(skill).toContain("step 9 of the steps above");
});

test("trama-implement skips the pre-flight and the targeted scan when the Advisor Scanner is on, and keeps them otherwise", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  expect(skill).toContain("## Advisor Scanner");
  expect(skill).toContain("This section applies only when the instruction says \"The Advisor Scanner is on\". Without that sentence, skip it and follow the steps as written.");
  expect(skill).toContain("there is no pre-flight: announce no check for it, run no `trama task scope --pre-flight`, and go straight to step 1");
  expect(skill).toContain("With the Advisor Scanner on, this step never runs: go on to step 8 with the check open.");
  expect(skill).toContain("With the Advisor Scanner on, step 7 never runs: announce no Scanning phase");
  expect(skill).toContain("it blocks every Task not Done that concerns the same thing");
  expect(skill).toContain("A Task already In progress that it blocks is not stopped: finish it");
  expect(skill).toContain("Correct that code before moving the Task to Done; do not file a Drift for it.");
});

test("trama-scan reports how many Machines were compared and how many produced cards, with no triage line", () => {
  const skill = SKILLS["trama-scan/SKILL.md"] as string;
  expect(skill).toContain("count of Machines compared");
  expect(skill).toContain("the count of those that produced at least one Task or Drift");
  expect(skill).not.toContain("Do not report triage, skipped-Machine, or classifier-error counts");
});


test("trama-resolve-drifts splits fragments over 12 KB in the same Proposal, keeping the 4,000-character budget in mind", () => {
  const skill = SKILLS["trama-resolve-drifts/SKILL.md"] as string;
  expect(skill).toContain("larger than 12 KB");
  expect(skill).toContain("split that fragment in the same Proposal before handing it over");
  expect(skill).toContain("move the sections without changing their text");
  expect(skill).toContain("4,000-character budget");
  expect(skill).toContain("prefer a few medium fragments to many tiny ones");
});

test("the five skills name cards by short number and title but write only the permanent identity", () => {
  for (const name of ["trama-design", "trama-scan", "trama-implement", "trama-import", "trama-resolve-drifts"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    expect(skill).toContain("## Naming cards");
    expect(skill).toContain("by short number and title");
    expect(skill).toContain("use **only the permanent identity**");
    expect(skill).toContain("**Never write a short number in a file**");
  }
});

test("the six skills that create cards give them a short title, and no command checks its length", () => {
  for (const name of ["trama-design", "trama-setup", "trama-scan", "trama-implement", "trama-import", "trama-resolve-drifts"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    expect(skill).toContain("a **short title**: at most five words, about 40 characters");
    expect(skill).toContain("\"Testo fantasma\" instead of");
    expect(skill).toContain("Titles that Trama or a skill composes from another title stay as they are");
    expect(skill).toContain(name === "trama-setup" ? "(see Hard rules)" : "(see Naming cards)");
  }
});

test("a CRLF checkout (core.autocrlf) of installed skills and omp definitions is not a conflict, and an update leaves it as it is", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    const skill = join(root, ".agents/skills/trama-scan/SKILL.md");
    const analysis = join(root, ".omp/agents/trama-analysis.md");
    for (const path of [skill, analysis]) writeFileSync(path, readFileSync(path, "utf8").replace(/\n/g, "\r\n"));
    const crlf = readFileSync(skill, "utf8");
    expect(crlf).toContain("\r\n");
    expect(skillConflicts(join(root, ".agents/skills"))).toEqual([]);
    expect(ompAgentConflicts(root)).toEqual([]);
    expect(run(["--root", root, "skills", "update"], root).out).toContain("already up to date");
    expect(readFileSync(skill, "utf8")).toBe(crlf);
    expect(readFileSync(analysis, "utf8")).toContain("\r\n");

    writeFileSync(skill, "custom scan skill\r\n");
    expect(skillConflicts(join(root, ".agents/skills"))).toEqual([skill]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
