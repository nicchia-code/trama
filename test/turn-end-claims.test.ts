import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
const { tmpdir } = os;
// The registry of agent processes and the editor records live in the developer's home: a temporary one keeps the real home untouched.
const home = mkdtempSync(join(tmpdir(), "trama-claims-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));
import { removeAgentProcess, writeAgentProcess } from "../src/core/agent-processes";
import { announce } from "../src/core/announcements";
import { type ClaimWriter, claimHolders, claimWrites } from "../src/core/claims";
import type { TurnEnd } from "../src/core/omp-chat-conversation";
import type { OmpLaunch } from "../extension/src/host/omp-chat/ports";
import { questionProjectId } from "../src/core/question-channel";
import { projectAt } from "../src/core/store";

// A minimal editor: the calls the launches and the watchers of agent.ts make. No terminal is ever created: omp Chat is on.
const none = () => ({ dispose() {} });
const settingValues: Record<string, unknown> = { agent: "omp" };
const inspected: Record<string, { globalValue?: unknown }> = { ompChat: { globalValue: true } };
let workspaceRoot = "";

mock.module("vscode", () => ({
  window: {
    terminals: [],
    onDidStartTerminalShellExecution: none,
    onDidEndTerminalShellExecution: none,
    onDidChangeTerminalShellIntegration: none,
    onDidCloseTerminal: none,
    createTerminal: () => {
      throw new Error("no terminal: omp Chat is on");
    },
    showErrorMessage: () => undefined,
    showWarningMessage: () => Promise.resolve(undefined),
    showInformationMessage: () => Promise.resolve(undefined),
    tabGroups: { all: [], onDidChangeTabs: none },
  },
  workspace: {
    get workspaceFolders() {
      return [{ uri: { scheme: "file", fsPath: workspaceRoot } }];
    },
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => (key in settingValues ? settingValues[key] : fallback),
      inspect: (key: string) => inspected[key] ?? (key in settingValues ? { globalValue: settingValues[key] } : undefined),
      update: async () => undefined,
    }),
    createFileSystemWatcher: () => ({ onDidCreate: none, onDidChange: none, onDidDelete: none, dispose() {} }),
  },
  Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath, toString: () => fsPath }), joinPath: (base: unknown, ...parts: string[]) => ({ base, parts, toString: () => parts.join("/") }), parse: (value: string) => ({ toString: () => value }) },
  RelativePattern: class {},
  TabInputText: class {},
  TabInputTerminal: class {},
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", shell: process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash", clipboard: { writeText: async () => undefined }, openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
    static from(...items: unknown[]) { return { dispose() { void items; } }; }
  },
  ConfigurationTarget: { Global: 1 },
  extensions: { getExtension: () => undefined },
}));
mock.module("../extension/src/host/questions", () => ({ questionEndpoint: async () => "endpoint", questionWindowId: async () => "window-id", ownWindowId: () => undefined, interruptTerminalRounds: () => undefined, EditorQuestions: class {}, askPreparedRound: async () => undefined }));

/** One process of omp that the fake client started. */
interface FakeProcess {
  launch: { env: Record<string, string> };
  /** omp answers the prompt of the work: what the conversation's turn-end listener hears. */
  endTurn: (end: TurnEnd) => void;
  id: string;
}

let dir: string;
const processes: FakeProcess[] = [];
beforeAll(async () => {
  (await import("../extension/src/host/omp-launch")).setOmpLauncher(async (ompPath) => (ompPath === "" ? "omp" : ompPath));
  dir = mkdtempSync(join(tmpdir(), "trama-turn-end-claims-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceRoot = dir;
  const { setOmpChat } = await import("../extension/src/host/agent");
  const session = (process: FakeProcess) => ({
    sessionId: `s${processes.length}`,
    pid: 5000 + processes.length,
    inTurn: true,
    sendPrompt: async () => undefined,
    send: async () => undefined,
    cancel() {},
    stop: async () => undefined,
    onExit: none,
    onTurnEnd: (listener: (end: TurnEnd) => void) => {
      process.endTurn = listener;
      return { dispose() {} };
    },
    onUpdate: none,
    onTurn: none,
    onFormRequest: none,
    answerForm() {},
    onPermissionRequest: none,
    onPermissionCancelled: none,
    onPermissionAnswered: none,
    onSend: none,
    answerPermission() {},
    models: async () => ({ available: [] }),
    setModel: async () => undefined,
  });
  const saved = new Map<string, unknown>();
  await setOmpChat(
    {
      client: {
        start: async (launch: OmpLaunch, _first?: unknown, spawned?: (pid: number) => void) => {
          const process: FakeProcess = { launch, endTurn: () => undefined, id: launch.env["TRAMA_TERMINAL"] as string };
          processes.push(process);
          spawned?.(5000 + processes.length - 1);
          return session(process);
        },
        resume: async () => {
          throw new Error("not used");
        },
      },
      view: {
        open() {},
        setWorking() {},
        close() {},
        onStopRequested: none,
        onCloseRequested: none,
        showGeneral() {},
        setGeneralSession() {},
        setSession() {},
        generalStatus() {},
        generalCleared() {},
        removeGeneral() {},
        returnToField() {},
        onClearGeneralRequested: none,
        onInstallOmpRequested: none,
        onGeneralMessage: none,
      },
    } as never,
    { get: (key) => saved.get(key), update: async (key, value) => void saved.set(key, value) },
    () => undefined,
  );
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));
// Each test starts with no claim: what one leaves is not another's.
beforeEach(() => rmSync(join(dir, ".trama", "claims"), { recursive: true, force: true }));

const sub = (agent: string, terminal: string): ClaimWriter => ({ role: "sub", agent, terminal, ancestors: ["main"] });
const claimed = (file: string, terminal: string): void => void claimWrites(dir, [file], sub(`sub-of-${terminal}`, terminal));
const files = (): string[] => (existsSync(join(dir, ".trama", "claims")) ? readdirSync(join(dir, ".trama", "claims")).filter((name) => name.endsWith(".json")) : []);

describe("the turn end of a conversation frees the claims of its files", () => {
  test("omp's answer to the prompt of a Run forgets every claim of that conversation and only of it", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    expect(await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", { kind: "work", title: "T3" }, () => true, "run", undefined, {})).toBe("conversation");
    const id = (processes.at(-1) as FakeProcess).id;
    claimed("src/a.ts", id);
    claimed("src/b.ts", id);
    claimed("src/other.ts", "other1");
    expect(claimHolders(dir).sort()).toEqual([id, "other1"].sort());

    (processes.at(-1) as FakeProcess).endTurn({ stopReason: "end_turn" });

    expect(claimHolders(dir)).toEqual(["other1"]);
    // Another agent writes the freed files as from Libero.
    expect(claimWrites(dir, ["src/a.ts"], sub("late", "third1"))).toBeUndefined();
  });
});

describe("the execution check forgets the claims of a holder nobody follows", () => {
  test("a holder no window follows and whose process is gone, never registered or not the same loses its claims; the others keep them", async () => {
    const { addHolderFollower } = await import("../extension/src/host/followed-holders");
    const { releaseUnfollowed } = await import("../extension/src/host/task-release");
    const projectId = questionProjectId(projectAt(dir));
    const follower = addHolderFollower((holder) => holder === "here01");
    try {
      await writeAgentProcess(projectId, "alive1", process.pid);
      await writeAgentProcess(projectId, "dead01", 2_000_000_000);
      for (const holder of ["here01", "alive1", "dead01", "never1"]) claimed(`src/${holder}.ts`, holder);
      claimed("src/dead01-more.ts", "dead01");
      const released = await releaseUnfollowed(dir);
      expect(released.claims.sort()).toEqual(["dead01", "never1"]);
      expect(claimHolders(dir).sort()).toEqual(["alive1", "here01"]);
      expect(files()).toHaveLength(2);
    } finally {
      follower.dispose();
      removeAgentProcess(projectId, "alive1");
      removeAgentProcess(projectId, "dead01");
    }
  });

  test("the claims of one terminal are looked at together with its announcements, and a check of one Task looks at none", async () => {
    const { releaseUnfollowed } = await import("../extension/src/host/task-release");
    claimed("src/lost.ts", "lost01");
    announce(projectAt(dir), { kind: "task", title: "Lost", terminal: "lost01" });
    expect(await releaseUnfollowed(dir, "abcd1234")).toEqual({ tasks: [], announcements: [], claims: [] });
    expect(claimHolders(dir)).toEqual(["lost01"]);
    const released = await releaseUnfollowed(dir);
    expect(released).toMatchObject({ claims: ["lost01"] });
    expect(released.announcements).toHaveLength(1);
    expect(claimHolders(dir)).toEqual([]);
  });

  test("a registry that cannot be read releases nothing", async () => {
    const { releaseUnfollowed } = await import("../extension/src/host/task-release");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { runtimeDirectory } = await import("../src/core/question-channel");
    claimed("src/unknown.ts", "unread1");
    const runtime = runtimeDirectory();
    mkdirSync(runtime, { recursive: true });
    const registry = join(runtime, `agents-${questionProjectId(projectAt(dir))}.json`);
    writeFileSync(registry, "not json");
    try {
      expect((await releaseUnfollowed(dir)).claims).toEqual([]);
      expect(claimHolders(dir)).toEqual(["unread1"]);
    } finally {
      rmSync(registry, { force: true });
    }
  });
});
