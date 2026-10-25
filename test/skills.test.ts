import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { ADVISOR_INSTRUCTIONS, watchdogFile } from "../src/core/advisors";
import { parse } from "yaml";
import { ompAgentConflicts, SKILLS, skillConflicts } from "../src/cli/skills";
import { SUB_AGENTS } from "../src/core/sub-agents";


test("project new refuses to overwrite customised skill files and creates nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const custom = join(root, ".agents/skills/trama-scan/SKILL.md");
    mkdirSync(join(custom, ".."), { recursive: true });
    writeFileSync(custom, "my own scan skill\n");

    expect(() => run(["--root", root, "project", "new"], root)).toThrow(/Refusing to overwrite[\s\S]*trama-scan[\\/]SKILL\.md/);
    expect(readFileSync(custom, "utf8")).toBe("my own scan skill\n");
    expect(existsSync(join(root, ".trama"))).toBe(false);
    expect(existsSync(join(root, ".agents/skills/trama-design"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project new and project edit install the analysis sub-agent on its role, never on a concrete model", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
    const analysis = join(root, ".omp/agents/trama-analysis.md");
    expect(readFileSync(analysis, "utf8")).toMatch(/^---\nname: trama-analysis\ndescription: ".+"\nmodel: "@slow"\n---\n\n.*trama-scan/);
    rmSync(join(root, ".omp"), { recursive: true });
    run(["--root", root, "project", "edit"], root);
    expect(existsSync(analysis)).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project new and project edit install the implementer sub-agent without a model, so it runs on the main model", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
    const implementer = join(root, ".omp/agents/trama-implementer.md");
    const text = readFileSync(implementer, "utf8");
    expect(text).toMatch(/^---\nname: trama-implementer\ndescription: "Implements one Trama Task and reports how it ended\."\n---\n\n/);
    expect(text).not.toMatch(/^model:/m);
    expect(text).toContain("trama task move <id> doing");
    expect(Buffer.byteLength(text)).toBeLessThan(6 * 1024);
    rmSync(join(root, ".omp"), { recursive: true });
    run(["--root", root, "project", "edit"], root);
    expect(readFileSync(implementer, "utf8")).toBe(text);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project new refuses a customised implementer definition and creates nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const implementer = join(root, ".omp/agents/trama-implementer.md");
    mkdirSync(join(implementer, ".."), { recursive: true });
    writeFileSync(implementer, "custom implementer\n");
    expect(() => run(["--root", root, "project", "new"], root)).toThrow(/trama-implementer\.md/);
    expect(existsSync(join(root, ".trama"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project new ignores retired omp triage files but still refuses customised analysis definitions", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const triage = join(root, ".omp/agents/trama-triage.md");
    mkdirSync(join(triage, ".."), { recursive: true });
    writeFileSync(triage, "custom triage\n");
    expect(run(["--root", root, "project", "new"], root).exit).toBe(0);
    expect(readFileSync(triage, "utf8")).toBe("custom triage\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  const root2 = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const analysis = join(root2, ".omp/agents/trama-analysis.md");
    mkdirSync(join(analysis, ".."), { recursive: true });
    writeFileSync(analysis, "custom analysis\n");
    expect(() => run(["--root", root2, "project", "new"], root2)).toThrow(/trama-analysis\.md/);
    expect(existsSync(join(root2, ".trama"))).toBe(false);
  } finally {
    rmSync(root2, { recursive: true, force: true });
  }
});

test("project new writes the advisor WATCHDOG file, blocks on a customised copy, and project edit replaces it", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
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
      expect(() => run(["--root", blocked, "project", "new"], blocked)).toThrow(/WATCHDOG\.yml/);
      expect(existsSync(join(blocked, ".trama"))).toBe(false);
    } finally {
      rmSync(blocked, { recursive: true, force: true });
    }

    run(["--root", root, "project", "edit"], root);
    expect(readFileSync(watchdog, "utf8")).toBe(watchdogFile());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("project edit deletes obsolete omp triage definition regardless of content and reports it", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
    const triage = join(root, ".omp/agents/trama-triage.md");
    writeFileSync(triage, "custom triage\n");
    const result = run(["--root", root, "project", "edit"], root);
    expect(existsSync(triage)).toBe(false);
    expect(result.out).toContain(`Deleted the retired omp sub-agent definition: ${triage}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("project new with force replaces customised skills, and identical existing files are not a conflict", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    const design = join(root, ".agents/skills/trama-design/SKILL.md");
    const scan = join(root, ".agents/skills/trama-scan/SKILL.md");
    mkdirSync(join(design, ".."), { recursive: true });
    mkdirSync(join(scan, ".."), { recursive: true });
    writeFileSync(design, SKILLS["trama-design/SKILL.md"] as string); // same as ours: fine
    writeFileSync(scan, "custom\n");

    run(["--root", root, "project", "new", "--input", '{"force":true}'], root);
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
    expect(run(["--root", same, "project", "new"], same).exit).toBe(0);
  } finally {
    rmSync(same, { recursive: true, force: true });
  }
});

test("project edit deletes the retired trama-fix folder from the skill folders it looks at, reports it, and leaves .claude/skills and .github/skills alone", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
    const fixes = [".agents/skills", "tools/agent-skills"].map((d) => join(root, d, "trama-fix"));
    const untouched = [".claude/skills", ".github/skills"].map((d) => join(root, d, "trama-fix"));
    for (const fix of [...fixes, ...untouched]) {
      mkdirSync(join(fix, "notes"), { recursive: true });
      writeFileSync(join(fix, "SKILL.md"), "old fix skill\n");
      writeFileSync(join(fix, "notes/mine.md"), "customised\n");
    }

    const first = run(["--root", root, "project", "edit", "--input", '{"skillsDir":"tools/agent-skills"}'], root).out;
    for (const fix of fixes) expect(existsSync(fix)).toBe(false);
    for (const fix of untouched) expect(existsSync(join(fix, "notes/mine.md"))).toBe(true);
    expect(first).toContain("Deleted the retired trama-fix skill:");
    const second = run(["--root", root, "project", "edit", "--input", '{"skillsDir":"tools/agent-skills"}'], root).out;
    expect(second).not.toContain("Deleted the retired trama-fix skill:");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});


test("trama-implement reads each Task once from task show and checks the run once at the end", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  expect(skill).toContain("That text is the Model and the Requirements for this Task.");
  expect(skill).toContain("do not open a `trama-req-*` skill");
  expect(skill).toContain("run one `trama model show <ref>` for that Transition, and do not resume the tour");
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
  expect(skill).toContain("`trama task list --input -` with `runnable: true`, `scope: true`");
  expect(skill).toContain("`trama announcement new --input -` with `{\"kind\":\"check\",\"title\":\"<title>\",\"phase\":\"scanning\"}`");
  expect(skill).toContain("Pre-flight scan failed: the Run continues without it.");
  expect(skill).toContain("file only Drifts with no origin (no `task`)");
  expect(skill).toContain("never to file a Task, announce a check or run `trama task list`");
  expect(skill).toContain("**Proposal filters.**");
  expect(skill).toContain("`notProposals`");
  expect(skill).not.toContain("task next");
  expect(skill).not.toContain("task scope");
});

test("trama-implement writes History after the check and before the report, and only for runs that moved Tasks to Done", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  const steps = skill.slice(skill.indexOf("## Steps"));
  const history = steps.indexOf("8. **Write History.**");
  expect(history).toBeGreaterThan(steps.indexOf("7. **Scan the completed Tasks' scope.**"));
  expect(history).toBeLessThan(steps.indexOf("9. **Report.**"));
  expect(skill).toContain("`trama announcement move <id> history`");
  expect(skill).toContain("`trama history list --json`");
  expect(skill).toContain("`trama history show <id> --json`");
  expect(skill).toContain("`trama history edit <id> --input -` and `{\"tasks\":[\"<id>\"]}`");
  expect(skill).toContain("`trama history new --input -` and `{\"title\":\"<title>\",\"summary\":\"<text>\",\"body\":\"<text>\",\"tasks\":[\"<id>\"]}`");
  expect(skill).toContain("a sub-agent never writes them");
  expect(skill).toContain("step 9 of the steps above");
});

test("trama-implement runs the independent checks in parallel and waits for all of them before judging the check", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  const step6 = skill.slice(skill.indexOf("6. **Check the run.**"), skill.indexOf("7. **Scan the completed Tasks' scope.**"));
  expect(step6).toContain("as parallel processes");
  expect(step6).toContain("wait until every one has finished before judging the check");
  expect(step6).toContain("when both write the same files; when in doubt, run them one after the other");
  expect(step6).toContain("together, the checks that failed and those that depend on them");
});

test("trama-implement starts a History sub-agent after the check is announced, and writes the History itself when it gives no entries", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  const announcing = skill.slice(skill.indexOf("## Announcing the check"), skill.indexOf("## Hard rules"));
  expect(announcing).toContain("start one sub-agent right after announcing the check, before step 6");
  expect(announcing).toContain("`trama task show <id> --json`");
  expect(announcing).toContain("It runs no writing command, announces nothing and touches no code.");
  expect(announcing).toContain("if it did not come back or gave no valid entries, the agent writes them itself");
  const step8 = skill.slice(skill.indexOf("8. **Write History.**"), skill.indexOf("9. **Report.**"));
  expect(step8).toContain("If the sub-agent of the check came back with entries");
  expect(step8).toContain("Otherwise read the entries with `trama history list --json`");
});

test("trama-implement skips the pre-flight and the targeted scan when the Advisor Scanner is on, and keeps them otherwise", () => {
  const skill = SKILLS["trama-implement/SKILL.md"] as string;
  expect(skill).toContain("## Advisor Scanner");
  expect(skill).toContain("This section applies only when the instruction says \"The Advisor Scanner is on\". Without that sentence, skip it and follow the steps as written.");
  expect(skill).toContain("there is no pre-flight: announce no check for it, run no `trama task list` with `runnable` and `scope`, and go straight to step 1");
  expect(skill).toContain("With the Advisor Scanner on, this step never runs: go on to step 8 with the check open.");
  expect(skill).toContain("With the Advisor Scanner on, step 7 never runs: announce no Scanning phase");
  expect(skill).toContain("it blocks every Task not Done that concerns the same thing");
  expect(skill).toContain("A Task already In progress that it blocks is not stopped: finish it");
  expect(skill).toContain("Correct that code before moving the Task to Done; do not file a Drift for it.");
  expect(skill).not.toContain("Cursor");
  expect(skill).not.toContain("trama-advisor");
});

test("the skills that start sub-agents or are started by one have the Sub-agents context sharing section, valid only with the sentence, with no change to the rest", () => {
  for (const name of ["trama-design", "trama-scan", "trama-implement", "trama-import", "trama-resolve-drifts"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    expect(skill).toContain("## Sub-agents context sharing");
    expect(skill).toContain('This section applies only when the instruction says "The sub-agents context sharing is on: …". Without that sentence, skip it');
    expect(skill).toContain("in whatever way your agent starts sub-agents");
    expect(skill).toContain("Never code, never everything you gathered, and nothing you read only to pass it on.");
    expect(skill).toContain("``- `<ref>` — <where in the code>``");
    expect(skill).toContain("It does not reread the Trama texts it received and reads on its own only the ones that are missing. It always reads the code, also at the places it received");
    expect(skill).toContain("always runs the commands that register (`trama task move <id> doing`, `trama comparison new`, `trama drift new`)");
    expect(skill).toContain("A received place that no longer matches the code is ignored: it searches by itself. Context Sharing never stops a job.");
    expect(skill).toContain("never copy into every sub-agent all that you gathered");
    if (name === "trama-design") continue;
    expect(skill).toContain("the chain of its `previous` Drifts and where the code is");
    expect(skill).toContain("The code at its Where in the code is read again before deciding.");
  }
  expect(SKILLS["trama-design/SKILL.md"]).toContain("- **Exploration (step 1).** Each sub-agent receives the request and the parts of `trama model show` you already read about its part.");
  expect(SKILLS["trama-design/SKILL.md"]).toContain("receives the decisions of the interview, the new text of the Model and of the Requirements for its references");
  expect(SKILLS["trama-design/SKILL.md"]).toContain("Light code scan (step 7).");
  expect(SKILLS["trama-scan/SKILL.md"]).toContain("Lists of cards and the General Requirements stay out");
  expect(SKILLS["trama-implement/SKILL.md"]).toContain("A `trama-implementer` sub-agent loads no skill, and it skips `trama task show` only when it received that text.");
  expect(SKILLS["trama-implement/SKILL.md"]).toContain("If the definition is not installed, the project predates it: start your own sub-agents with the instructions below instead");
  expect(SKILLS["trama-implement/SKILL.md"]).toContain("`.omp/agents/trama-implementer.md`");
  expect(SKILLS["trama-implement/SKILL.md"]).toContain("The pre-flight and the end-of-Run scan.");
  const compare = SKILLS["trama-compare/SKILL.md"] as string;
  expect(compare).toContain("## Sub-agents context sharing");
  expect(compare).toContain('This section applies only when your instruction says "The sub-agents context sharing is on: …". Without that sentence, skip it');
  expect(compare).toContain("Take nothing from the briefing.");
  expect(compare).toContain("you still run `trama comparison new` and `trama comparison move`");
  expect(compare).toContain("Report back");
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

test("the skills give the writing rules: no first person in Trama's texts, and self-contained Tasks", () => {
  const firstPerson = "- **No first person in Trama's texts.**";
  const selfContained = "The body of a Task is understood without the conversation that produced it";
  for (const name of ["trama-design", "trama-setup", "trama-scan", "trama-compare", "trama-implement", "trama-import", "trama-resolve-drifts", "trama-merge"]) {
    const skill = SKILLS[`${name}/SKILL.md`] as string;
    expect(skill).toContain("## Language");
    expect(skill).toContain(firstPerson);
    expect(skill).toContain('Trama is always "Trama" and you are "the agent"');
    expect(skill).toContain("Your replies in the conversation are not Trama's texts and do not change");
    if (name !== "trama-import" && name !== "trama-resolve-drifts" && name !== "trama-merge") expect(skill).toContain(selfContained);
  }
});

test("trama-merge resolves the conflicts of the merge in progress and never commits, aborts, resets or touches .trama/", () => {
  const skill = SKILLS["trama-merge/SKILL.md"] as string;
  expect(skill).toContain("name: trama-merge");
  expect(skill).toContain("keeping the intent of **both sides**");
  expect(skill).toContain("ask the developer with `trama question new`");
  expect(skill).toContain("**Never commit.**");
  expect(skill).toContain("Never run `git merge --abort`, `git reset`");
  expect(skill).toContain("**Never touch `.trama/`.**");
  expect(skill).toContain("Run `git add <file>` for each file whose conflicts you resolved completely, and for no other file.");
  expect(skill).toContain("end with **one line** that tells the developer to review the files in the index and commit the merge");
  expect(skill).toContain("## Language");
});

test("every Language section carries the same list of what goes in the language and what stays English, with no transliteration of Model names", () => {
  const root = join(import.meta.dir, "..");
  const texts: Record<string, string> = {};
  for (const name of ["trama-design", "trama-setup", "trama-scan", "trama-compare", "trama-implement", "trama-import", "trama-resolve-drifts", "trama-merge"]) texts[name] = SKILLS[`${name}/SKILL.md`] as string;
  for (const name of ["ask-more", "general", "unify-drifts"]) texts[name] = readFileSync(join(root, "extension", "media", `${name}.md`), "utf8");
  const bullet = (text: string, start: string): string => {
    // A Windows checkout (core.autocrlf) gives the media files CRLF line ends.
    const line = text.split(/\r?\n/).find((l) => l.startsWith(start));
    expect(line).toBeDefined();
    return line as string;
  };
  const inLanguage = bullet(texts["trama-design"] as string, "- **In the language of the instruction:**");
  const english = bullet(texts["trama-design"] as string, "- **Always in English**, whatever the language:");
  expect(inLanguage).toContain("the titles and bodies of Tasks and the titles of groups of Tasks");
  expect(inLanguage).toContain("the resolution question the Async Drift Resolver prepares");
  expect(inLanguage).toContain("your replies during the work and your final report; the replies in General");
  expect(english).toContain("the whole Model (the name of the System; the names of Features, Machines, Actors and States; IDs and Event names; the descriptions in Model files)");
  expect(english).toContain("the Specs, also their `notes`");
  for (const text of Object.values(texts)) {
    expect(text).toContain("## Language");
    expect(bullet(text, "- **In the language of the instruction:**")).toBe(inLanguage);
    expect(bullet(text, "- **Always in English**, whatever the language:")).toBe(english);
    expect(bullet(text, "- **A language changes nothing already written.**")).toContain("never translate the whole file");
    expect(bullet(text, "- **No first person in Trama's texts.**")).toContain('Trama is always "Trama" and you are "the agent"');
    expect(text).not.toContain("transliterated");
    expect(text).not.toContain("PAGAMENTO_RIUSCITO");
  }
  expect(bullet(texts["ask-more"] as string, "- **In Ask more**")).toContain("in the language the developer writes in");
  expect(SUB_AGENTS["trama-implementer"].prompt).toContain("write the Tasks, Drifts, questions, notes and your report in that language, and always write the Model, the Requirements, the Specs, code, comments and commit messages in English");
});

test("a CRLF checkout (core.autocrlf) of installed skills and omp definitions is not a conflict, and a project edit leaves it as it is", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "project", "new"], root);
    const skill = join(root, ".agents/skills/trama-scan/SKILL.md");
    const analysis = join(root, ".omp/agents/trama-analysis.md");
    const implementer = join(root, ".omp/agents/trama-implementer.md");
    for (const path of [skill, analysis, implementer]) writeFileSync(path, readFileSync(path, "utf8").replace(/\n/g, "\r\n"));
    expect(readFileSync(implementer, "utf8")).toContain("\r\n");
    const crlf = readFileSync(skill, "utf8");
    expect(crlf).toContain("\r\n");
    expect(skillConflicts(join(root, ".agents/skills"))).toEqual([]);
    expect(ompAgentConflicts(root)).toEqual([]);
    expect(run(["--root", root, "project", "edit"], root).out).toContain("already up to date");
    expect(readFileSync(skill, "utf8")).toBe(crlf);
    expect(readFileSync(analysis, "utf8")).toContain("\r\n");
    expect(readFileSync(implementer, "utf8")).toContain("\r\n");

    writeFileSync(skill, "custom scan skill\r\n");
    expect(skillConflicts(join(root, ".agents/skills"))).toEqual([skill]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Asking sections tell the agent the developer sees only the round, in the same words", () => {
  const sentence = "The developer sees only the round (each question, its context, its options and their own answers), never your conversation.";
  for (const name of ["trama-design", "trama-import", "trama-resolve-drifts"]) {
    const text = readFileSync(join(import.meta.dir, "..", "skills", name, "SKILL.md"), "utf8");
    expect(text).toContain(sentence);
    expect(text).toContain('no first person (write "Trama" or "the agent", never "I" or "we")');
  }
});
