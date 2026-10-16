import { afterAll, afterEach, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as os from "node:os";

let storage: string;
let extensionPath: string;
let registered: Record<string, boolean> = { "/other/hooks.json": true };
let writeError: Error | undefined;
let updateError: Error | undefined;
const errors: string[] = [];
const updates: unknown[] = [];
const home = mkdtempSync(join(os.tmpdir(), "trama-hook-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));

mock.module("vscode", () => ({
  env: { appName: "Visual Studio Code" },
  extensions: { getExtension: () => ({ extensionPath }) },
  Uri: {
    joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts) }),
  },
  workspace: {
    fs: {
      createDirectory: async (uri: { fsPath: string }) => mkdirSync(uri.fsPath, { recursive: true }),
      writeFile: async (uri: { fsPath: string }, contents: Uint8Array) => {
        if (writeError) throw writeError;
        writeFileSync(uri.fsPath, contents);
      },
    },
    getConfiguration: () => ({
      get: (_key: string, fallback: string) => fallback,
      inspect: () => ({ globalValue: registered }),
      update: async (_key: string, value: Record<string, boolean>) => {
        updates.push(value);
        if (updateError) throw updateError;
        registered = value;
      },
    }),
  },
  ConfigurationTarget: { Global: 1 },
  window: {
    showErrorMessage: (message: string) => void errors.push(message),
    showInformationMessage: (message: string) => void errors.push(message),
  },
}));
let updateOutput = "";
mock.module("../src/cli/main", () => ({
  run: (args: string[]) =>
    args.includes("update") ? { out: updateOutput } : { out: "", exit: 0 },
}));

const { installCopilotHooks, updateSkills } = await import("../extension/src/host/project");

function setup(): void {
  storage = mkdtempSync(join(tmpdir(), "trama-hook-storage-"));
  extensionPath = mkdtempSync(join(tmpdir(), "trama-hook-extension-"));
  mkdirSync(join(extensionPath, "bin"));
  writeFileSync(join(extensionPath, "bin", "trama"), "binary");
  registered = { "/other/hooks.json": true };
  writeError = undefined;
  updateError = undefined;
  errors.length = 0;
  updates.length = 0;
}

afterEach(() => {
  if (storage) rmSync(storage, { recursive: true, force: true });
  if (extensionPath) rmSync(extensionPath, { recursive: true, force: true });
});

test("Copilot hooks use the bundled program in extension storage and preserve user registrations", async () => {
  setup();
  const file = join(storage, "copilot-hooks.json");
  await installCopilotHooks({ fsPath: storage } as never, false);
  expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({
    hooks: {
      UserPromptSubmit: [{ type: "command", command: `"${join(extensionPath, "bin", "trama")}" copilot-hook` }],
      Stop: [{ type: "command", command: `"${join(extensionPath, "bin", "trama")}" copilot-hook` }],
    },
  });
  expect(registered).toEqual({ "/other/hooks.json": true, [file]: true });
  expect(updates).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("on Windows the Copilot hook file carries the PowerShell form next to the plain command", async () => {
  setup();
  await installCopilotHooks({ fsPath: storage } as never, true);
  const program = join(extensionPath, "bin", "trama");
  const entry = { type: "command", command: `"${program}" copilot-hook`, windows: `& "${program}" copilot-hook` };
  expect(JSON.parse(readFileSync(join(storage, "copilot-hooks.json"), "utf8"))).toEqual({ hooks: { UserPromptSubmit: [entry], Stop: [entry] } });
});

test("Copilot hook file write failures are reported", async () => {
  setup();
  writeError = new Error("disk full");
  await installCopilotHooks({ fsPath: storage } as never);
  expect(errors[0]).toContain("could not install Copilot's hooks");
  expect(errors[0]).toContain("disk full");
  expect(updates).toHaveLength(0);
});

test("Copilot hook registration failures are reported", async () => {
  setup();
  updateError = new Error("settings are read-only");
  await installCopilotHooks({ fsPath: storage } as never);
  expect(existsSync(join(storage, "copilot-hooks.json"))).toBe(true);
  expect(errors[0]).toContain("could not install Copilot's hooks");
  expect(errors[0]).toContain("settings are read-only");
});

test("updating skills reports retired omp definition in editor notification", async () => {
  setup();
  const file = join(storage, "copilot-hooks.json");
  updateOutput = "Updated skills\nDeleted the retired omp sub-agent definition: /project/.omp/agents/trama-triage.md";
  await updateSkills({ root: "/project" } as never, { fsPath: storage } as never);
  expect(errors.at(-1)).toContain("trama-triage.md");
  expect(JSON.parse(readFileSync(file, "utf8")).hooks.UserPromptSubmit[0].command).toBe(`"${join(extensionPath, "bin", "trama")}" copilot-hook`);
});

test("updating skills reports why the trama-specs skill was kept", async () => {
  setup();
  updateOutput = "Updated skills\nRequirement skills: one skill per fragment (budget 100/4000 characters).\nThe trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`";
  await updateSkills({ root: "/project" } as never, { fsPath: storage } as never);
  expect(errors.at(-1)).toContain("The trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`");
});
