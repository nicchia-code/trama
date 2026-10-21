import { afterAll, afterEach, expect, mock, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as os from "node:os";

// The program the packaging ships for this platform: `trama.exe` on Windows (see bundledTrama).
const bundledName = process.platform === "win32" ? "trama.exe" : "trama";

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

const editor = { appName: "Visual Studio Code" };
mock.module("vscode", () => ({
  env: editor,
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
    args.includes("edit") ? { out: updateOutput } : { out: "", exit: 0 },
}));

const { installEditorHooks, removeCopilotPieces, updateSkills } = await import("../extension/src/host/project");

function setup(): void {
  storage = mkdtempSync(join(tmpdir(), "trama-hook-storage-"));
  extensionPath = mkdtempSync(join(tmpdir(), "trama-hook-extension-"));
  mkdirSync(join(extensionPath, "bin"));
  writeFileSync(join(extensionPath, "bin", bundledName), "binary");
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

function copilotAgent(): string {
  const file = join(home, ".copilot", "agents", "trama-analysis.agent.md");
  mkdirSync(join(home, ".copilot", "agents"), { recursive: true });
  writeFileSync(file, "old");
  return file;
}

test("outside Cursor, removal deletes the Copilot hooks file and only its entry in chat.hookFilesLocations", async () => {
  setup();
  const file = join(storage, "copilot-hooks.json");
  writeFileSync(file, "{}");
  registered = { "/other/hooks.json": true, [file]: true };
  const removed = await removeCopilotPieces({ fsPath: storage } as never);
  expect(existsSync(file)).toBe(false);
  expect(registered).toEqual({ "/other/hooks.json": true });
  expect(updates).toHaveLength(1);
  expect(removed).toHaveLength(2);
});

test("without a Copilot entry the setting is not touched", async () => {
  setup();
  writeFileSync(join(storage, "copilot-hooks.json"), "{}");
  const removed = await removeCopilotPieces({ fsPath: storage } as never);
  expect(updates).toHaveLength(0);
  expect(registered).toEqual({ "/other/hooks.json": true });
  expect(removed).toHaveLength(1);
});

test("Copilot's agent file is removed in every editor, but the hooks file is kept in Cursor", async () => {
  setup();
  const agent = copilotAgent();
  const file = join(storage, "copilot-hooks.json");
  writeFileSync(file, "{}");
  editor.appName = "Cursor";
  try {
    const removed = await removeCopilotPieces({ fsPath: storage } as never);
    expect(existsSync(agent)).toBe(false);
    expect(existsSync(file)).toBe(true);
    expect(updates).toHaveLength(0);
    expect(removed).toHaveLength(1);
  } finally {
    editor.appName = "Visual Studio Code";
  }
});

test("with nothing to remove it returns nothing", async () => {
  setup();
  expect(await removeCopilotPieces({ fsPath: storage } as never)).toEqual([]);
  expect(updates).toHaveLength(0);
});

test("updating skills reports retired omp definition and each Copilot piece removed", async () => {
  setup();
  const agent = copilotAgent();
  updateOutput = "Updated skills\nDeleted the retired omp sub-agent definition: /project/.omp/agents/trama-triage.md";
  await updateSkills({ root: "/project" } as never, { fsPath: storage } as never);
  expect(errors.at(-1)).toContain("trama-triage.md");
  expect(errors.at(-1)).toContain(`Removed Copilot's sub-agent definition ${agent}.`);
  expect(existsSync(agent)).toBe(false);
  expect(errors.at(-1)).not.toContain("Chat sub-agent definition written");
});

test("updating skills says nothing about Copilot when there was nothing to remove", async () => {
  setup();
  updateOutput = "Updated skills";
  await updateSkills({ root: "/project" } as never, { fsPath: storage } as never);
  expect(errors.at(-1)).not.toContain("Removed");
});

test("updating skills reports why the trama-specs skill was kept", async () => {
  setup();
  updateOutput = "Updated skills\nRequirement skills: one skill per fragment (budget 100/4000 characters).\nThe trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`";
  await updateSkills({ root: "/project" } as never, { fsPath: storage } as never);
  expect(errors.at(-1)).toContain("The trama-specs skill was not updated, because Specs is not valid: line 3: unknown key `colour`");
});

test("activation writes Cursor's hooks in the developer's own hooks file, rewriting only when the entries change", async () => {
  setup();
  editor.appName = "Cursor";
  const cursorDir = join(home, ".cursor");
  rmSync(cursorDir, { recursive: true, force: true });
  try {
    await installEditorHooks();
    const program = join(extensionPath, "bin", bundledName);
    const hooks = JSON.parse(readFileSync(join(cursorDir, "hooks.json"), "utf8")).hooks;
    expect(hooks.stop).toEqual([{ command: `${process.platform === "win32" ? "& " : ""}"${program}" hook cursor` }]);
    expect(existsSync(join(storage, "copilot-hooks.json"))).toBe(false);
  } finally {
    editor.appName = "Visual Studio Code";
  }
});

test("activation reports an invalid Cursor hooks file and leaves it untouched", async () => {
  setup();
  editor.appName = "Cursor";
  const cursorDir = join(home, ".cursor");
  rmSync(cursorDir, { recursive: true, force: true });
  mkdirSync(cursorDir);
  writeFileSync(join(cursorDir, "hooks.json"), "{ broken");
  try {
    await installEditorHooks();
    expect(errors[0]).toContain("could not write Cursor's hooks");
    expect(readFileSync(join(cursorDir, "hooks.json"), "utf8")).toBe("{ broken");
  } finally {
    editor.appName = "Visual Studio Code";
  }
});
