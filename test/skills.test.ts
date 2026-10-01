import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COMMANDS } from "../src/cli/commands";
import { run } from "../src/cli/main";
import { SKILLS } from "../src/cli/skills";

const names = new Set(COMMANDS.map((c) => c.name));
const options = new Map(COMMANDS.map((c) => [c.name, new Set(Object.keys(c.options ?? {}))]));

test("every command and flag a skill mentions exists in the CLI", () => {
  const problems: string[] = [];
  for (const [file, content] of Object.entries(SKILLS)) {
    if (!file.endsWith("SKILL.md")) continue;
    for (const span of content.matchAll(/`(trama [^`]+)`/g)) {
      const words = (span[1] as string).split(/\s+/).slice(1).filter((w) => !w.startsWith("<") && !w.startsWith("[") && !w.startsWith('"'));
      const positional = words.filter((w) => !w.startsWith("-") && !w.startsWith("…"));
      const two = `${positional[0]} ${positional[1]}`;
      const command = names.has(two) ? two : positional[0];
      if (command === undefined || !names.has(command)) {
        problems.push(`${file}: unknown command in \`${span[1]}\``);
        continue;
      }
      for (const flag of words.filter((w) => w.startsWith("--")))
        if (flag !== "--json" && !options.get(command)?.has(flag.slice(2))) problems.push(`${file}: \`${command}\` has no ${flag}`);
    }
  }
  expect(problems).toEqual([]);
});

test("each skill declares a name equal to its folder and a trigger description", () => {
  for (const [file, content] of Object.entries(SKILLS)) {
    if (!file.endsWith("SKILL.md")) continue;
    const front = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(content);
    expect(front, file).not.toBeNull();
    expect(front?.[1]).toBe(file.split("/")[0]);
    expect(front?.[2]).toMatch(/^Use when/);
  }
});

test("the design skill links to a FORMAT.md that ships with it", () => {
  expect(SKILLS["trama-design/SKILL.md"]).toContain("(./FORMAT.md)");
  expect(SKILLS["trama-design/FORMAT.md"]).toContain("## Machine");
});

test("init installs the skills where asked, and the default is .agents/skills", () => {
  const root = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", root, "init"], root);
    for (const rel of Object.keys(SKILLS)) expect(readFileSync(join(root, ".agents/skills", rel), "utf8")).toBe(SKILLS[rel] as string);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const other = mkdtempSync(join(tmpdir(), "trama-skills-"));
  try {
    run(["--root", other, "init", "--skills-dir", ".claude/skills"], other);
    expect(existsSync(join(other, ".claude/skills/trama-scan/SKILL.md"))).toBe(true);
    expect(existsSync(join(other, ".agents"))).toBe(false);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});

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
