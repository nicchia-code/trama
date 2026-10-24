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
let updateOutput = "";
mock.module("../src/cli/main", () => ({
  run: (args: string[]) =>
    args.includes("edit") ? { out: updateOutput } : { out: "", exit: 0 },
}));

// Dynamic import: it must come after `mock.module`, which has to be in place before this module loads.
const { updateSkills } = await import("../extension/src/host/project");

test("updating skills reports the retired omp definition it deleted", async () => {
  messages.length = 0;
  updateOutput = "Updated skills\nDeleted the retired omp sub-agent definition: /project/.omp/agents/trama-triage.md";
  await updateSkills({ root: "/project" } as never);
  expect(messages.at(-1)).toContain("trama-triage.md");
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
    updateOutput = "Updated skills";
    await updateSkills({ root: "/project" } as never);
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
  updateOutput = "Updated skills\nRequirement skills: one skill per fragment (budget 100/4000 characters).\nThe trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`";
  await updateSkills({ root: "/project" } as never);
  expect(messages.at(-1)).toContain("The trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`");
});
