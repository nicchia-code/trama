import { FIX_OPTIONS } from "./fix-options";
import { projectAt } from "../src/core/store";
import { getDrift, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";
import { expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let delegation: string | undefined;
mock.module("vscode", () => ({
  window: { createWebviewPanel: () => { throw new Error("no panel in this test"); }, showWarningMessage: () => undefined, showErrorMessage: () => undefined, showInformationMessage: async () => undefined },
  workspace: { workspaceFolders: [], getWorkspaceFolder: () => undefined, getConfiguration: () => ({ get: () => undefined, inspect: (key: string) => (key === "autoFixDrifts" ? { globalValue: delegation === "enabled" || delegation === "yolo" } : key === "autoFixCriticalDrifts" ? { globalValue: delegation === "yolo" } : undefined) }) },
  Uri: { joinPath: () => ({ fsPath: "" }), file: (path: string) => ({ fsPath: path, toString: () => path }), parse: (value: string) => ({ toString: () => value }) },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

// The modules load after mock.module replaced "vscode", so they are imported here, as the other host tests do.
const { Controller } = await import("../extension/src/host/controller");
const { autopilotFailedCase, autopilotFailures, receiveCoordinatorMessage } = await import("../extension/src/host/drift-resolution");

test("withdrawing the delegation during a Run fails no Task: unstarted ones stay in their column without a failure", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-withdraw-"));
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    collection: unknown;
    advanceCollection(project: { root: string }, collection: unknown): Promise<void>;
  };
  // Delegation is disabled (the default), so the next step withdraws the collection.
  internals.collection = {
    root,
    id: "collection",
    drifts: ["drift-1"],
    resolutionJob: "resolution-job",
    proposals: [],
    approvedDrifts: new Set(),
    handovers: new Set(),
    stage: "running",
    fixTasks: new Map(),
    origins: new Map([["notstarted", "drift-1"]]),
    runJob: "run-job",
  };
  await internals.advanceCollection({ root }, internals.collection);
  expect(internals.collection).toBeUndefined();
  expect(autopilotFailures(root)).toEqual([]);
  controller.dispose();
});

test("a critical Drift approved before the delegation moved to enabled is left to the developer without an autopilot failure", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-critical-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Critical difference", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", critical: true, where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    collection: unknown;
    advanceCollection(project: unknown, collection: unknown): Promise<void>;
  };
  internals.collection = {
    root,
    id: "collection",
    drifts: [drift.id],
    resolutionJob: "resolution-job",
    proposals: [],
    approvedDrifts: new Set([drift.id]),
    handovers: new Set(),
    stage: "authorized",
    fixTasks: new Map([["fix-task", drift.id]]),
    origins: new Map(),
  };
  await internals.advanceCollection(project, internals.collection);
  expect(internals.collection).toBeUndefined();
  expect(autopilotFailures(root)).toEqual([]);
  expect(autopilotFailedCase(root, drift.id)).toBe(false);
  controller.dispose();
  delegation = undefined;
});

test("a fix Task closed without changes unblocks its origin in the automatic Run, with no failed case", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-unchanged-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const origin = newTask(project, { title: "Refund prepared orders", refs: ["order"], technical: false });
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], origin: origin.id, happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  resolveDrift(project, drift.id, "fix-code", [], { option: 1 });
  const fix = getDrift(project, drift.id).data.task as string;
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    collection: unknown;
    authorizedCollectionTasks(project: unknown, collection: unknown, mode: "enabled"): string[];
  };
  const collection = {
    root,
    id: "collection",
    drifts: [drift.id],
    resolutionJob: "resolution-job",
    proposals: [],
    approvedDrifts: new Set([drift.id]),
    handovers: new Set(),
    stage: "authorized",
    fixTasks: new Map([[fix, drift.id]]),
    origins: new Map([[origin.id, drift.id]]),
  };
  expect(internals.authorizedCollectionTasks(project, collection, "enabled")).toEqual([fix]);
  moveTask(project, fix, "done", "developer", {}, "Checked: the code already does what the Model says.");
  expect(internals.authorizedCollectionTasks(project, collection, "enabled")).toEqual([origin.id]);
  expect(autopilotFailures(root)).toEqual([]);
  expect(autopilotFailedCase(root, origin.id)).toBe(false);
  controller.dispose();
  delegation = undefined;
});

test("a failed final check of an automatic Run stops its further Tasks, which then carry the reason", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-final-check-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const origin = newTask(project, { title: "Refund prepared orders", refs: ["order"], technical: false });
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], origin: origin.id, happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  resolveDrift(project, drift.id, "fix-code", [], { option: 1 });
  const fix = getDrift(project, drift.id).data.task as string;
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    collection: unknown;
    authorizedCollectionTasks(project: unknown, collection: unknown, mode: "enabled"): string[];
    advanceCollection(project: unknown, collection: unknown): Promise<void>;
  };
  const collection = {
    root,
    id: "collection",
    drifts: [drift.id],
    resolutionJob: "resolution-job",
    proposals: [],
    approvedDrifts: new Set([drift.id]),
    handovers: new Set(),
    stage: "running",
    runJob: "run-job",
    fixTasks: new Map([[fix, drift.id]]),
    origins: new Map([[origin.id, drift.id]]),
  };
  internals.collection = collection;
  receiveCoordinatorMessage({ type: "job", id: "run-job", root, kind: "run", active: true, origin: "automatic", place: { terminal: "terminal-1" } });
  expect(internals.authorizedCollectionTasks(project, collection, "enabled")).toEqual([fix]);
  receiveCoordinatorMessage({ type: "check", root, job: "run-job", phase: "verifying", failed: true, title: "Final check after all Tasks" });
  expect(internals.authorizedCollectionTasks(project, collection, "enabled")).toEqual([]);
  expect(autopilotFailures(root)).toEqual([expect.objectContaining({ job: "run-job", reason: expect.stringContaining("final check") })]);
  receiveCoordinatorMessage({ type: "job", id: "run-job", root, kind: "run", active: false });
  await internals.advanceCollection(project, collection);
  expect(internals.collection).toBeUndefined();
  expect(autopilotFailedCase(root, fix)).toBe(true);
  expect(autopilotFailedCase(root, origin.id)).toBe(true);
  controller.dispose();
  delegation = undefined;
});
