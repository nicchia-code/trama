import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncRequirementSkills } from "../src/core/requirement-skills";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

const specsFile = () => join(p.dir, "specs.yaml");
const skillFile = () => join(dir, ".agents/skills/trama-specs/SKILL.md");
const SPECS = "languages:\n  - name: TypeScript\n    version: '5.6'\n  - name: Go\n    chosenByAgent: fits the CLI\nframeworks:\n  - name: React\n    note: the panel\nnotes: Ship on tags.\n";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-specs-skill-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  mkdirSync(join(dir, ".agents/skills/trama-design"), { recursive: true });
  writeFileSync(join(dir, ".agents/skills/trama-design/SKILL.md"), "---\nname: trama-design\n---\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("the trama-specs skill", () => {
  test("a valid Specs writes the fields that have entries in order, with the agent's reasons and the notes", () => {
    writeFileSync(specsFile(), SPECS);
    syncRequirementSkills(p);
    const text = readFileSync(skillFile(), "utf8");
    expect(text).toContain("name: trama-specs\n");
    expect(text.indexOf("## Languages")).toBeLessThan(text.indexOf("## Frameworks and libraries"));
    expect(text).toContain("- TypeScript 5.6");
    expect(text).toContain("- Go (chosen by the agent: fits the CLI)");
    expect(text).toContain("- React: the panel");
    expect(text).not.toContain("## Testing");
    expect(text).toContain("## Notes\n\nShip on tags.");
  });

  test("removing specs.yaml removes the skill", () => {
    writeFileSync(specsFile(), SPECS);
    syncRequirementSkills(p);
    rmSync(specsFile());
    expect(syncRequirementSkills(p).specsSkill).toEqual({ state: "absent" });
    expect(existsSync(join(dir, ".agents/skills/trama-specs"))).toBe(false);
  });

  test("an invalid Specs keeps the skill that was there and says why", () => {
    writeFileSync(specsFile(), SPECS);
    syncRequirementSkills(p);
    const before = readFileSync(skillFile(), "utf8");
    writeFileSync(specsFile(), "languages: nope\n");
    expect(syncRequirementSkills(p).specsSkill).toEqual({ state: "kept", problem: "languages must be a list of entries" });
    expect(readFileSync(skillFile(), "utf8")).toBe(before);
  });

  test("a valid Specs adds its name and description to the Requirement budget", () => {
    const without = syncRequirementSkills(p).budget;
    writeFileSync(specsFile(), SPECS);
    const withSpecs = syncRequirementSkills(p).budget;
    const description = /^description: (.*)$/m.exec(readFileSync(skillFile(), "utf8"))?.[1] ?? "";
    expect(withSpecs - without).toBe("trama-specs".length + description.length);
  });

  test("an invalid Specs adds nothing to the Requirement budget unless its skill is already there", () => {
    const without = syncRequirementSkills(p).budget;
    writeFileSync(specsFile(), "languages: nope\n");
    expect(syncRequirementSkills(p).budget).toBe(without);
    writeFileSync(specsFile(), SPECS);
    const withSpecs = syncRequirementSkills(p).budget;
    writeFileSync(specsFile(), "languages: nope\n");
    expect(syncRequirementSkills(p).budget).toBe(withSpecs);
  });
});
