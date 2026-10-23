import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as os from "node:os";

const home = mkdtempSync(join(os.tmpdir(), "trama-check-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));

const editor = { appName: "Visual Studio Code" };
const messages: { kind: "info" | "error"; text: string }[] = [];
mock.module("vscode", () => ({
  env: editor,
  ConfigurationTarget: { Global: 1 },
  workspace: { getConfiguration: () => ({ get: (_key: string, fallback: string) => fallback, inspect: () => ({ globalValue: undefined }), update: async () => {} }) },
  window: {
    showInformationMessage: (text: string) => void messages.push({ kind: "info", text }),
    showErrorMessage: (text: string) => void messages.push({ kind: "error", text }),
  },
}));

// Dynamic imports: they must come after `mock.module`, which has to be in place before these modules load.
const { run } = await import("../src/cli/main");
const { checkSkills } = await import("../extension/src/host/project");
const { projectAt } = await import("../src/core/store");

const UPDATED = "Trama: updated the agent skills to this version.";
let root: string;
let storage: string;
const storageUri = () => ({ fsPath: storage }) as never;

beforeEach(async () => {
  root = mkdtempSync(join(os.tmpdir(), "trama-check-"));
  storage = mkdtempSync(join(os.tmpdir(), "trama-check-storage-"));
  editor.appName = "Visual Studio Code";
  rmSync(join(home, ".cursor"), { recursive: true, force: true });
  run(["--root", root, "project", "new"], root);
  messages.length = 0;
  await checkSkills(projectAt(root), storageUri());
  messages.length = 0;
});

test("a project already in line with this version shows nothing", async () => {
  await checkSkills(projectAt(root), storageUri());
  expect(messages).toEqual([]);
});

test("an edited skill is replaced without asking and the short notice appears once", async () => {
  const file = join(root, ".agents/skills/trama-design/SKILL.md");
  writeFileSync(file, "edited by hand");
  await checkSkills(projectAt(root), storageUri());
  expect(messages).toEqual([{ kind: "info", text: UPDATED }]);
  expect(readFileSync(file, "utf8")).not.toBe("edited by hand");
  await checkSkills(projectAt(root), storageUri());
  expect(messages).toHaveLength(1);
});

test("a changed advisor file counts as an update, a deleted retired file too", async () => {
  writeFileSync(join(root, ".omp/WATCHDOG.yml"), "instructions: []\n");
  await checkSkills(projectAt(root), storageUri());
  expect(messages.map((m) => m.text)).toEqual([UPDATED]);
  expect(readFileSync(join(root, ".omp/WATCHDOG.yml"), "utf8")).toContain("Trama turn reviewer");

  messages.length = 0;
  writeFileSync(join(root, ".omp/agents/trama-triage.md"), "old");
  await checkSkills(projectAt(root), storageUri());
  expect(messages.map((m) => m.text)).toEqual([UPDATED]);
  expect(existsSync(join(root, ".omp/agents/trama-triage.md"))).toBe(false);
});

test("removing a Copilot piece counts as an update", async () => {
  mkdirSync(join(home, ".copilot/agents"), { recursive: true });
  const agent = join(home, ".copilot/agents/trama-analysis.agent.md");
  writeFileSync(agent, "old");
  await checkSkills(projectAt(root), storageUri());
  expect(messages.map((m) => m.text)).toEqual([UPDATED]);
  expect(existsSync(agent)).toBe(false);

  messages.length = 0;
  const hooks = join(storage, "copilot-hooks.json");
  writeFileSync(hooks, "{}");
  await checkSkills(projectAt(root), storageUri());
  expect(messages.map((m) => m.text)).toEqual([UPDATED]);
  expect(existsSync(hooks)).toBe(false);
});

test("both sub-agent definitions are written and rewritten only in Cursor", async () => {
  const agent = join(home, ".cursor/agents/trama-analysis.md");
  const advisor = join(home, ".cursor/agents/trama-advisor.md");
  await checkSkills(projectAt(root), storageUri());
  expect(existsSync(agent)).toBe(false);
  expect(existsSync(advisor)).toBe(false);
  expect(messages).toEqual([]);

  editor.appName = "Cursor";
  await checkSkills(projectAt(root), storageUri());
  expect(messages.map((m) => m.text)).toEqual([UPDATED]);
  expect(readFileSync(agent, "utf8")).toContain("name: trama-analysis");
  expect(readFileSync(advisor, "utf8")).toContain("name: trama-advisor");
  expect(readFileSync(advisor, "utf8")).toContain("trama advisor review");
  // One definition for rounds and reviews, with neither `is_background` nor `readonly`; it reads the transcript from the position and ends with the result for the agent.
  const definition = readFileSync(advisor, "utf8");
  expect(definition).not.toContain("is_background");
  expect(definition).not.toContain("readonly");
  expect(definition).toContain("from that byte on");
  expect(definition).toContain("Trama's Advisor found that your Task's code drifts from the Model or the Requirements; fix it before you move the Task to Done: <notes>");
  expect(existsSync(join(home, ".cursor/agents/trama-advisor-background.md"))).toBe(false);

  for (const file of [agent, advisor]) {
    messages.length = 0;
    writeFileSync(file, "edited by hand");
    await checkSkills(projectAt(root), storageUri());
    expect(messages.map((m) => m.text)).toEqual([UPDATED]);
    expect(readFileSync(file, "utf8")).not.toBe("edited by hand");
  }

  messages.length = 0;
  await checkSkills(projectAt(root), storageUri());
  expect(messages).toEqual([]);
});

test("it neither creates the starting Areas nor moves single-file Areas to Area folders", async () => {
  rmSync(join(root, ".trama/requirements"), { recursive: true });
  writeFileSync(join(root, ".agents/skills/trama-design/SKILL.md"), "old");
  await checkSkills(projectAt(root), storageUri());
  expect(existsSync(join(root, ".trama/requirements"))).toBe(false);

  mkdirSync(join(root, ".trama/requirements"));
  writeFileSync(join(root, ".trama/requirements/ui.md"), '---\ndescription: "Use when building screens."\n---\n# Interface\n\n## General\n\n- Something.\n');
  await checkSkills(projectAt(root), storageUri());
  expect(existsSync(join(root, ".trama/requirements/ui.md"))).toBe(true);
  expect(existsSync(join(root, ".trama/requirements/ui"))).toBe(false);
});

test("a failure shows the error, and the next opening shows it again while the problem stays", async () => {
  rmSync(join(root, ".omp"), { recursive: true });
  writeFileSync(join(root, ".omp"), "not a folder");
  await checkSkills(projectAt(root), storageUri());
  await checkSkills(projectAt(root), storageUri());
  expect(messages).toHaveLength(2);
  for (const m of messages) {
    expect(m.kind).toBe("error");
    expect(m.text).toStartWith("Trama: could not update the agent skills: ");
  }
});
