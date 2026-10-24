import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
const { tmpdir } = os;
// Some host code reads the developer's home: a temporary one keeps the real home untouched.
const home = mkdtempSync(join(tmpdir(), "trama-turn-end-home-"));
mock.module("node:os", () => ({ ...os, homedir: () => home }));
afterAll(() => rmSync(home, { recursive: true, force: true }));
import { listAnnouncements, withdrawAll } from "../src/core/announcements";
import { readAgentProcess } from "../src/core/agent-processes";
import { questionProjectId } from "../src/core/question-channel";
import type { TurnEnd } from "../src/core/omp-chat-conversation";
import type { OmpLaunch } from "../extension/src/host/omp-chat/ports";
import { editInProposal, getProposal, newProposal, rebaseInProposal } from "../src/core/proposals";
import { projectAt, type Project } from "../src/core/store";
import { coverWithTask } from "./cover";
import { handOver } from "./handover";
import { getTask, moveTask, newTask } from "../src/core/work";

// A minimal editor: the calls the launches and the watchers of agent.ts make. No terminal is ever created: omp Chat is on.
const none = () => ({ dispose() {} });
const settingValues: Record<string, unknown> = { agent: "omp" };
const inspected: Record<string, { globalValue?: unknown }> = { ompChat: { globalValue: true } };
const errorMessages: string[] = [];
const warningMessages: string[] = [];
let workspaceRoot = "";
/** The omp the launches find; a test makes it vanish to see what an instruction that does not start leaves. */
let ompFound: (ompPath: string) => Promise<string | undefined> = async (ompPath) => (ompPath === "" ? "omp" : ompPath);

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
    showErrorMessage: (message: string) => void errorMessages.push(message),
    showWarningMessage: (message: string) => (warningMessages.push(message), Promise.resolve(undefined)),
    showInformationMessage: () => Promise.resolve(undefined),
    tabGroups: { all: [], onDidChangeTabs: none },
    createWebviewPanel: () => ({
      reveal() {},
      dispose() {},
      onDidDispose: none,
      webview: { html: "", cspSource: "", asWebviewUri: (uri: unknown) => uri, onDidReceiveMessage: none, postMessage: async () => true },
    }),
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
  stops: number;
  /** omp answers the prompt of the work: what the conversation's turn-end listener hears. */
  endTurn: (end: TurnEnd) => void;
  id: string;
}

let dir: string;
let processes: FakeProcess[] = [];
beforeAll(async () => {
  (await import("../extension/src/host/omp-launch")).setOmpLauncher((ompPath) => ompFound(ompPath));
  dir = mkdtempSync(join(tmpdir(), "trama-turn-end-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  workspaceRoot = dir;
  const { setOmpChat, watchAgentTerminal } = await import("../extension/src/host/agent");
  watchAgentTerminal();
  const session = (process: FakeProcess) => ({
    sessionId: `s${processes.length}`,
    pid: 5000 + processes.length,
    inTurn: true,
    sendPrompt: async () => undefined,
    send: async () => undefined,
    cancel() {},
    stop: async () => void process.stops++,
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
    answerPermission() {},
    models: async () => ({ available: [] }),
    setModel: async () => undefined,
  });
  const saved = new Map<string, unknown>();
  await setOmpChat(
    {
      client: {
        start: async (launch: OmpLaunch, _first?: unknown, spawned?: (pid: number) => void) => {
          const process: FakeProcess = { launch, stops: 0, endTurn: () => undefined, id: launch.env["TRAMA_TERMINAL"] as string };
          processes.push(process);
          spawned?.(process.id === "" ? 1 : 5000 + processes.length - 1);
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

const lastProcess = (): FakeProcess => processes.at(-1) as FakeProcess;

describe("the turn end of a job conversation ends its work, with no hook", () => {
  test("a Run's turn end releases the Tasks it took, its filed work and its process, withdraws its card, ends its job and tells onEnd once with nothing", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { driftWork, driftsFinishing, followsAgent, isHooked, localProjectJobs, receiveNotice } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    withdrawAll(p);
    const ends: (string | undefined)[] = [];
    expect(await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", { kind: "work", title: "T3" }, () => true, "run", undefined, { onEnd: (abnormal) => void ends.push(abnormal) })).toBe("conversation");
    const id = lastProcess().id;
    const task = moveTask(p, newTask(p, { title: "Held", refs: ["order/Paid"], technical: false }).id, "doing", "agent", { terminal: id }).id;

    // The conversation is followed for its job without the hook: what it files is held until its turn ends.
    expect(isHooked(id)).toBe(false);
    expect(followsAgent(dir, id)).toBe(true);
    receiveNotice({ type: "drift-filed", root: dir, holder: id, drift: "drift001" });
    expect(driftsFinishing(dir)).toEqual(["drift001"]);
    expect(driftWork(dir).running).toBe(true);
    expect(listAnnouncements(p).map((a) => a.terminal)).toEqual([id]);
    // Real wait, on purpose: the process is registered after reading its start from the system with a child process, which no microtask flush can wait for.
    for (let waited = 0; readAgentProcess(questionProjectId(p), id) === undefined && waited < 4000; waited += 25) await new Promise((done) => setTimeout(done, 25));
    expect(readAgentProcess(questionProjectId(p), id)).toBeDefined();

    lastProcess().endTurn({ stopReason: "end_turn" });

    expect(getTask(p, task).data.column).toBe("todo");
    expect(getTask(p, task).data.agent).toBe(false);
    expect(driftsFinishing(dir)).toEqual([]);
    expect(readAgentProcess(questionProjectId(p), id)).toBeUndefined();
    expect(listAnnouncements(p)).toEqual([]);
    expect(localProjectJobs(dir)).toEqual([]);
    expect(driftWork(dir)).toEqual({ resolving: false, running: false });
    expect(followsAgent(dir, id)).toBe(false);
    expect(lastProcess().stops).toBe(1);
    expect(ends).toEqual([undefined]);
    // A second answer of the same work changes nothing.
    lastProcess().endTurn({ stopReason: "end_turn" });
    expect(ends).toEqual([undefined]);
  });

  test("an abnormal turn end reaches the job's end and the Board: a refusal, a limit, and omp refusing the prompt; a stop by the developer shows nothing", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { jobAbnormalEnd, onAgentStopped } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    withdrawAll(p);
    const stopped: [string, string][] = [];
    const subscription = onAgentStopped((job, reason) => void stopped.push([job, reason]));
    try {
      const cases: [TurnEnd, string | undefined][] = [
        [{ stopReason: "refusal" }, "the model refused to continue"],
        [{ stopReason: "max_tokens" }, "the model reached its token limit"],
        [{ stopReason: "max_turn_requests" }, "the model reached its request limit"],
        [{ error: "no credentials" }, "omp refused the prompt (no credentials)"],
        [{ stopReason: "cancelled" }, undefined],
        [{ stopReason: "end_turn" }, undefined],
      ];
      for (const [end, reason] of cases) {
        const ends: (string | undefined)[] = [];
        stopped.length = 0;
        await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run", undefined, { id: `job-${processes.length}`, onEnd: (abnormal) => void ends.push(abnormal) });
        lastProcess().endTurn(end);
        expect(ends).toEqual([reason]);
        expect(jobAbnormalEnd(dir, `job-${processes.length - 1}`)).toBe(reason);
        expect(stopped).toEqual(reason === undefined ? [] : [["T3", reason]]);
      }
    } finally {
      subscription.dispose();
    }
  });

  test("a sequence of Run all is one Run: the end of a Run that lets the next start does not end it, the last one does; an abnormal end stops it without more Runs", async () => {
    const { endHeldJob, launchAgent, startHeldJob } = await import("../extension/src/host/agent");
    const { driftWork } = await import("../extension/src/host/drift-resolution");
    const { runSequence } = await import("../extension/src/host/run-groups");
    const p = projectAt(dir);
    withdrawAll(p);
    const runs = ["a", "b", "c"].map((model) => ({ run: { model }, group: {}, tasks: [] as string[] }));
    const sequence = async (end: (index: number) => TurnEnd) => {
      const before = processes.length;
      const finished: (string | undefined)[] = [];
      // Each Run's launch signals once its conversation is open: the test waits for that, not for a time.
      const opened = runs.map(() => Promise.withResolvers<void>());
      let next = 0;
      startHeldJob(dir, "run", "held-run");
      runSequence(
        runs,
        async (run, onEnd) => {
          const mine = opened[next++];
          const launched = await launchAgent(dir, `Run ${run.run.model}.`, "Run", undefined, () => true, "run", undefined, { onEnd });
          mine?.resolve();
          return launched !== undefined;
        },
        (abnormal) => {
          finished.push(abnormal);
          endHeldJob(dir, "held-run", abnormal);
        },
      );
      for (let index = 0; index < runs.length; index++) {
        await opened[index]?.promise;
        // While any Run of the sequence works or waits to start, the project is running.
        expect(driftWork(dir).running).toBe(true);
        const turn = end(index);
        lastProcess().endTurn(turn);
        if ("stopReason" in turn && turn.stopReason !== "end_turn") break;
        if (index + 1 < runs.length) expect(driftWork(dir).running).toBe(true);
      }
      return { launched: processes.length - before, finished };
    };

    const normal = await sequence(() => ({ stopReason: "end_turn" }));
    expect(normal).toEqual({ launched: 3, finished: [undefined] });
    expect(driftWork(dir).running).toBe(false);

    const refused = await sequence((index) => (index === 1 ? { stopReason: "refusal" } : { stopReason: "end_turn" }));
    expect(refused).toEqual({ launched: 2, finished: ["the model refused to continue"] });
    expect(driftWork(dir).running).toBe(false);
  });

  test("a resolution and a unification end at their turn end: the project is Free again, and the Drifts of the unification are no longer being unified", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { driftWork, localProjectJobs, unifyingDrifts } = await import("../extension/src/host/drift-resolution");
    const p = projectAt(dir);
    withdrawAll(p);

    expect(await launchAgent(dir, "Use the trama-resolve-drifts skill.", "Resolve Drifts", { kind: "resolve", drifts: () => ["drift001"] }, () => true, "resolve")).toBe("conversation");
    expect(driftWork(dir).resolving).toBe(true);
    expect(listAnnouncements(p).map((a) => a.kind)).toEqual(["proposal"]);
    lastProcess().endTurn({ stopReason: "end_turn" });
    expect(driftWork(dir).resolving).toBe(false);
    expect(listAnnouncements(p)).toEqual([]);

    expect(await launchAgent(dir, "Use the trama-resolve-drifts skill to unify.", "Unify Drifts", { kind: "unify", drifts: () => ["drift001", "drift002"] }, () => true, "unify", undefined, { drifts: () => ["drift001", "drift002"] })).toBe("conversation");
    expect(unifyingDrifts(dir)).toEqual(["drift001", "drift002"]);
    expect(driftWork(dir).resolving).toBe(true);
    lastProcess().endTurn({ stopReason: "end_turn" });
    expect(unifyingDrifts(dir)).toEqual([]);
    expect(driftWork(dir).resolving).toBe(false);
    expect(localProjectJobs(dir)).toEqual([]);
    expect(listAnnouncements(p)).toEqual([]);
  });
});

describe("a delivered card waits for the turn end of the conversation that delivered it", () => {
  test("a Drift, a Proposal and a Task filed by a job conversation stay finishing until its own turn end; another conversation's end and a holder this window does not follow release nothing", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { driftsFinishing, followsAgent, onDriftResolutionChange, proposalsFinishing, receiveNotice, tasksFinishing } = await import("../extension/src/host/drift-resolution");
    const { buildSnapshot } = await import("../src/core/snapshot");
    const p = projectAt(dir);
    withdrawAll(p);
    await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
    const mine = lastProcess();
    await launchAgent(dir, "Use the trama-scan skill on the whole System.", "Scan", { kind: "check", title: "Scan" }, () => true, "scan");
    const other = lastProcess();
    const filing = (holder: string) => {
      receiveNotice({ type: "drift-filed", root: dir, holder, drift: "drift001" });
      receiveNotice({ type: "proposal-delivered", root: dir, holder, proposal: "prop0001" });
      receiveNotice({ type: "task-filed", root: dir, holder, task: "task0001" });
    };
    const finishing = () => [driftsFinishing(dir), proposalsFinishing(dir), tasksFinishing(dir)];
    let refreshes = 0;
    const subscription = onDriftResolutionChange(() => void refreshes++);
    try {
      expect(followsAgent(dir, mine.id)).toBe(true);
      expect(followsAgent(dir, other.id)).toBe(true);
      // A holder that is none of this window's conversations is not followed here: the window that follows it holds what it files.
      expect(followsAgent(dir, "nobody")).toBe(false);

      filing(mine.id);
      expect(finishing()).toEqual([["drift001"], ["prop0001"], ["task0001"]]);
      const snapshot = buildSnapshot(p, driftsFinishing(dir), proposalsFinishing(dir), tasksFinishing(dir));
      expect([snapshot.finishingDrifts, snapshot.finishingProposals, snapshot.finishingTasks]).toEqual([["drift001"], ["prop0001"], ["task0001"]]);

      other.endTurn({ stopReason: "end_turn" });
      expect(finishing()).toEqual([["drift001"], ["prop0001"], ["task0001"]]);

      refreshes = 0;
      mine.endTurn({ stopReason: "end_turn" });
      expect(finishing()).toEqual([[], [], []]);
      // The panel hears of it, so the buttons enable on their own.
      expect(refreshes).toBeGreaterThan(0);
      const released = buildSnapshot(p, driftsFinishing(dir), proposalsFinishing(dir), tasksFinishing(dir));
      expect([released.finishingDrifts, released.finishingProposals, released.finishingTasks]).toEqual([[], [], []]);
    } finally {
      subscription.dispose();
    }
  });

  test("an abnormal turn end releases the cards too, and so does a notice of another window that heard the turn end", async () => {
    const { launchAgent } = await import("../extension/src/host/agent");
    const { driftsFinishing, receiveNotice, tasksFinishing } = await import("../extension/src/host/drift-resolution");
    withdrawAll(projectAt(dir));
    await launchAgent(dir, "Use the trama-implement skill on Task abcd1234.", "T3", undefined, () => true, "run");
    const refused = lastProcess();
    receiveNotice({ type: "drift-filed", root: dir, holder: refused.id, drift: "drift002" });
    refused.endTurn({ stopReason: "refusal" });
    expect(driftsFinishing(dir)).toEqual([]);

    // A window that follows the agent holds what it files; the other window's notice of its turn end releases it.
    await launchAgent(dir, "Use the trama-implement skill on Task efgh5678.", "T4", undefined, () => true, "run");
    const held = lastProcess();
    receiveNotice({ type: "task-filed", root: dir, holder: held.id, task: "task0002" });
    expect(tasksFinishing(dir)).toEqual(["task0002"]);
    receiveNotice({ type: "turn-ended", root: dir, holder: held.id });
    expect(tasksFinishing(dir)).toEqual([]);
  });
});

describe("the turn end of a conversation ends its refinement", () => {
  /** A window on a copy of the shop project with the refinement on, and the refinements it launches (the promise of each launch is kept to wait for it). */
  const refiningWindow = async () => {
    const { Controller } = await import("../extension/src/host/controller");
    const { receiveNotice } = await import("../extension/src/host/drift-resolution");
    const root = mkdtempSync(join(tmpdir(), "trama-turn-end-refine-"));
    cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
    const previousRoot = workspaceRoot;
    workspaceRoot = root;
    settingValues["autoUpdateStaleProposals"] = true;
    const controller = new Controller({ scheme: "file" } as never);
    await controller.open();
    const host = controller as unknown as {
      refinement: { running: ReadonlyMap<string, unknown>; queued: string[]; waiting: string[] };
      handle(raw: unknown): Promise<void>;
      launchAction(project: Project, action: { kind: string; proposal?: string }): Promise<void>;
    };
    const launches: Promise<void>[] = [];
    const launch = host.launchAction.bind(host);
    host.launchAction = (project, action) => {
      const launched = launch(project, action);
      launches.push(launched);
      return launched;
    };
    const p = projectAt(root);
    withdrawAll(p);
    /** An open Proposal that the Model has changed under, so Approve refines it. */
    const stale = (title: string, line: string): string => {
      const proposal = newProposal(p, title);
      const file = editInProposal(p, proposal.id, "checkout/order.md");
      writeFileSync(file, readFileSync(file, "utf8").replace("### Cancelled (final)", `### Cancelled (final)\n\n### ${line} (final)`));
      coverWithTask(p, proposal.id, "checkout", "user");
      handOver(p, proposal.id);
      return proposal.id;
    };
    const changeModel = (): void => {
      const model = join(root, ".trama", "model", "checkout", "order.md");
      writeFileSync(model, `${readFileSync(model, "utf8")}\nUna riga in più.\n`);
    };
    /** What the agent does: realigns the Proposal over the current Model, hands it over, and the editor hears of the delivery. */
    const deliver = (id: string, holder: string): void => {
      rebaseInProposal(p, id);
      handOver(p, id);
      receiveNotice({ type: "proposal-delivered", root, holder, proposal: id });
    };
    const approve = async (id: string): Promise<void> => {
      await host.handle({ type: "approveProposal", id });
      await launches.at(-1);
    };
    const close = (): void => {
      controller.dispose();
      delete settingValues["autoUpdateStaleProposals"];
      ompFound = async (ompPath) => (ompPath === "" ? "omp" : ompPath);
      workspaceRoot = previousRoot;
      rmSync(root, { recursive: true, force: true });
    };
    return { host, p, stale, changeModel, deliver, approve, launches, close };
  };

  test("omp's answer at the end of the turn approves the delivered Proposal and starts the next one of the queue, which stays at work; with none left the refinement rests", async () => {
    const window = await refiningWindow();
    try {
      const first = window.stale("First", "Lost");
      const second = window.stale("Second", "Gone");
      window.changeModel();
      const before = processes.length;
      await window.approve(first);
      expect(processes).toHaveLength(before + 1);
      expect([...window.host.refinement.running.keys()]).toEqual([first]);
      await window.approve(second);
      expect(window.host.refinement.queued).toEqual([second]);
      expect(processes).toHaveLength(before + 1);

      window.deliver(first, lastProcess().id);
      lastProcess().endTurn({ stopReason: "end_turn" });
      expect(getProposal(window.p, first).data.status).toBe("approved");
      // The next of the queue starts and the refinement stays at work.
      await window.launches.at(-1);
      expect(processes).toHaveLength(before + 2);
      expect([...window.host.refinement.running.keys()]).toEqual([second]);
      expect(window.host.refinement.queued).toEqual([]);

      // Nothing delivered: the Proposal stays as it is, to refine, and the refinement rests with nothing queued.
      lastProcess().endTurn({ stopReason: "end_turn" });
      expect(getProposal(window.p, second).data.status).toBe("open");
      expect([...window.host.refinement.running.keys()]).toEqual([]);
      expect(window.host.refinement.queued).toEqual([]);
      expect(processes).toHaveLength(before + 2);
    } finally {
      window.close();
    }
  });

  test("an abnormal turn end ends the refinement too: the Board says why, and a Proposal delivered before it is looked at as usual", async () => {
    const window = await refiningWindow();
    const { onAgentStopped } = await import("../extension/src/host/drift-resolution");
    const stopped: string[] = [];
    const subscription = onAgentStopped((_job, reason) => void stopped.push(reason));
    try {
      const proposal = window.stale("Refused", "Lost");
      window.changeModel();
      await window.approve(proposal);
      expect([...window.host.refinement.running.keys()]).toEqual([proposal]);
      lastProcess().endTurn({ stopReason: "max_tokens" });
      expect(stopped).toEqual(["the model reached its token limit"]);
      expect([...window.host.refinement.running.keys()]).toEqual([]);
      expect(getProposal(window.p, proposal).data.status).toBe("open");
    } finally {
      subscription.dispose();
      window.close();
    }
  });

  test("a delivered Proposal that is stale again rejoins the queue at its turn end and is refined again", async () => {
    const window = await refiningWindow();
    try {
      const proposal = window.stale("Again", "Lost");
      window.changeModel();
      const before = processes.length;
      await window.approve(proposal);
      window.deliver(proposal, lastProcess().id);
      // The Model moves again before the agent's turn ends: the delivered Proposal is stale once more.
      window.changeModel();
      lastProcess().endTurn({ stopReason: "end_turn" });
      await window.launches.at(-1);
      expect(getProposal(window.p, proposal).data.status).toBe("open");
      expect(processes).toHaveLength(before + 2);
      expect([...window.host.refinement.running.keys()]).toEqual([proposal]);
    } finally {
      window.close();
    }
  });

  test("when the instruction of the next refinement does not start the queue empties, the refinement rests and the Board says so; the Proposals that waited are refinable again", async () => {
    const window = await refiningWindow();
    try {
      const first = window.stale("First", "Lost");
      const second = window.stale("Second", "Gone");
      const third = window.stale("Third", "Missing");
      window.changeModel();
      const before = processes.length;
      await window.approve(first);
      await window.approve(second);
      await window.approve(third);
      expect(window.host.refinement.queued).toEqual([second, third]);

      window.deliver(first, lastProcess().id);
      warningMessages.length = 0;
      ompFound = async () => undefined;
      lastProcess().endTurn({ stopReason: "end_turn" });
      await window.launches.at(-1)?.catch(() => undefined);
      expect(getProposal(window.p, first).data.status).toBe("approved");
      expect(processes).toHaveLength(before + 1);
      expect([...window.host.refinement.running.keys()]).toEqual([]);
      expect(window.host.refinement.queued).toEqual([]);
      expect(warningMessages.filter((message) => message.includes("did not start"))).toHaveLength(1);
      // Back at rest, a new Approve refines again.
      ompFound = async (ompPath) => (ompPath === "" ? "omp" : ompPath);
      await window.approve(third);
      expect([...window.host.refinement.running.keys()]).toEqual([third]);
      expect(processes).toHaveLength(before + 2);
    } finally {
      window.close();
    }
  });
});
