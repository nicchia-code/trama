import { afterAll, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as os from "node:os";

const home = mkdtempSync(join(os.tmpdir(), "trama-hook-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));

const messages: string[] = [];
const updates: unknown[] = [];
const editor = { appName: "Visual Studio Code" };
mock.module("vscode", () => ({
  env: editor,
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, fallback: string) => fallback,
      inspect: () => ({ globalValue: undefined }),
      update: async (_key: string, value: unknown) => void updates.push(value),
    }),
  },
  ConfigurationTarget: { Global: 1 },
  window: {
    showErrorMessage: (message: string) => void messages.push(message),
    showInformationMessage: (message: string) => void messages.push(message),
  },
}));
// The refresh of the skills is what Update skills runs now (no process, no in-process command): its result is canned and the report of the command line's `project edit` is built from it.
const refreshed = { skillsDir: "/project/.agents/skills", changed: [] as string[], removed: [] as string[], removedAgents: [] as string[], agents: [] as string[], agentsChanged: [] as string[], areas: [] as string[], conversion: { converted: [], skipped: [] }, generated: { mode: "fragment", budget: 100, switchedFrom: null, changed: [], specsSkill: { state: "generated" } }, updated: false };
mock.module("../src/cli/skill-refresh", () => ({
  refreshProjectSkillsAsync: async () => refreshed,
  refreshProjectSkills: () => refreshed,
}));

// Dynamic import: it must come after `mock.module`, which has to be in place before this module loads.
const { updateSkills } = await import("../extension/src/host/project");

test("updating skills reports the retired omp definition it deleted", async () => {
  messages.length = 0;
  refreshed.removedAgents = ["/project/.omp/agents/trama-triage.md"];
  await updateSkills({ root: "/project", dir: "/project/.trama" } as never);
  expect(messages.at(-1)).toContain("trama-triage.md");
  refreshed.removedAgents = [];
});

test("updating skills neither reads nor deletes what earlier versions wrote for Copilot, and says nothing about it", async () => {
  messages.length = 0;
  updates.length = 0;
  const storage = mkdtempSync(join(tmpdir(), "trama-hook-storage-"));
  try {
    const agent = join(home, ".copilot", "agents", "trama-analysis.agent.md");
    mkdirSync(join(home, ".copilot", "agents"), { recursive: true });
    writeFileSync(agent, "old");
    const hooks = join(storage, "copilot-hooks.json");
    writeFileSync(hooks, "{}");
    await updateSkills({ root: "/project", dir: "/project/.trama" } as never);
    expect(readFileSync(agent, "utf8")).toBe("old");
    expect(existsSync(hooks)).toBe(true);
    expect(updates).toEqual([]);
    expect(messages.at(-1)).not.toMatch(/Copilot|Removed/);
  } finally {
    rmSync(storage, { recursive: true, force: true });
  }
});

test("updating skills reports why the trama-specs skill was kept", async () => {
  messages.length = 0;
  refreshed.generated = { ...refreshed.generated, specsSkill: { state: "kept", problem: "line 3: unknown key `colour`" } } as never;
  await updateSkills({ root: "/project", dir: "/project/.trama" } as never);
  expect(messages.at(-1)).toContain("The trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`");
});
