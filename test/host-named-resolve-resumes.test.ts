import { FIX_OPTIONS } from "./fix-options";
import { projectAt } from "../src/core/store";
import { newDrift } from "../src/core/work";
import { expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let delegation: string | undefined;
mock.module("vscode", () => ({
  window: { createWebviewPanel: () => { throw new Error("no panel in this test"); }, showWarningMessage: () => undefined, showErrorMessage: () => undefined, showInformationMessage: async () => undefined },
  workspace: { workspaceFolders: [], getWorkspaceFolder: () => undefined, getConfiguration: () => ({ get: () => undefined, inspect: (key: string) => (key === "driftAutoPilot" ? { globalValue: delegation } : undefined) }) },
  Uri: { joinPath: () => ({ fsPath: "" }), file: (path: string) => ({ fsPath: path, toString: () => path }), parse: (value: string) => ({ toString: () => value }) },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class {
    constructor(readonly dispose: () => void) {}
  },
}));

const { Controller } = await import("../extension/src/host/controller");

test("Resolve on one automatic-eligible Drift in the coordinating window starts nothing while the coordinator cannot verify the other windows", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-gate-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const calls: string[] = [];
  const internals = controller as unknown as {
    coordinator: { isCoordinator(root: string): Promise<boolean>; importJobs(root: string): Promise<boolean>; currentWindowId(root: string): string | undefined } | undefined;
    ownedCoordinatorRoot: string | undefined;
    autopilotTick(): Promise<void>;
    coordinate(project: unknown): Promise<void>;
    startAutomaticResolution(project: unknown, drifts: string[]): Promise<boolean>;
    namedAutomatic: { root: string; drift: string } | undefined;
    launchAction(project: unknown, action: unknown): Promise<void>;
  };
  internals.ownedCoordinatorRoot = root;
  internals.coordinator = { isCoordinator: async () => true, importJobs: async () => false, currentWindowId: () => undefined };
  // The editor's project lookup finds no workspace in this test: the tick runs the coordinator's checks on this project.
  internals.autopilotTick = async () => internals.coordinate(project);
  internals.startAutomaticResolution = async (_project, drifts) => {
    calls.push(`start:${drifts.join(",")}`);
    return true;
  };
  await internals.launchAction(project, { kind: "resolve-drifts", drift: drift.id });
  expect(calls).toEqual([]);
  expect(internals.namedAutomatic).toEqual({ root, drift: drift.id });
  controller.dispose();
  delegation = undefined;
});

test("Resolve on one automatic-eligible Drift in the coordinating window starts that Drift alone once the other windows answered", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-start-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const calls: string[] = [];
  const internals = controller as unknown as {
    coordinator: { isCoordinator(root: string): Promise<boolean>; importJobs(root: string): Promise<boolean>; currentWindowId(root: string): string | undefined } | undefined;
    ownedCoordinatorRoot: string | undefined;
    autopilotTick(): Promise<void>;
    coordinate(project: unknown): Promise<void>;
    startAutomaticResolution(project: unknown, drifts: string[]): Promise<boolean>;
    launchAction(project: unknown, action: unknown): Promise<void>;
  };
  internals.ownedCoordinatorRoot = root;
  internals.coordinator = { isCoordinator: async () => true, importJobs: async () => true, currentWindowId: () => undefined };
  internals.autopilotTick = async () => internals.coordinate(project);
  internals.startAutomaticResolution = async (_project, drifts) => {
    calls.push(`start:${drifts.join(",")}`);
    return true;
  };
  await internals.launchAction(project, { kind: "resolve-drifts", drift: drift.id });
  expect(calls).toEqual([`start:${drift.id}`]);
  controller.dispose();
  delegation = undefined;
});

test("Resolve on one automatic-eligible Drift in a window that does not coordinate forwards that Drift alone", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-forward-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const calls: string[] = [];
  const internals = controller as unknown as {
    ownedCoordinatorRoot: string | undefined;
    startAutomaticResolution(project: unknown, drifts: string[]): Promise<boolean>;
    resumeCoordinator(project: unknown, drift?: string): Promise<void>;
    launchAction(project: unknown, action: unknown): Promise<void>;
  };
  internals.ownedCoordinatorRoot = undefined;
  internals.startAutomaticResolution = async (_project, drifts) => {
    calls.push(`start:${drifts.join(",")}`);
    return true;
  };
  internals.resumeCoordinator = async (_project, named) => {
    calls.push(`forward:${named ?? ""}`);
  };
  await internals.launchAction(project, { kind: "resolve-drifts", drift: drift.id });
  expect(calls).toEqual([`forward:${drift.id}`]);
  controller.dispose();
  delegation = undefined;
});

test("the coordinator takes a forwarded Drift as its named request and drops it once the Drift is no longer eligible", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-coordinator-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    coordinator: { isCoordinator(root: string): Promise<boolean> } | undefined;
    autopilotTick(): Promise<void>;
    coordinatorMessage(message: Record<string, unknown>): Promise<unknown>;
    eligibleDrifts(project: unknown, mode: string): string[];
    namedAutomatic: { root: string; drift: string } | undefined;
  };
  internals.coordinator = { isCoordinator: async () => true };
  internals.autopilotTick = async () => undefined;
  expect(await internals.coordinatorMessage({ type: "resolve-drifts", root, drift: drift.id })).toEqual({ coordinator: true, received: true });
  expect(internals.namedAutomatic).toEqual({ root, drift: drift.id });
  expect(internals.eligibleDrifts(project, "enabled")).toEqual([drift.id]);
  internals.namedAutomatic = { root, drift: "zzzzzzzz" };
  expect(internals.eligibleDrifts(project, "enabled")).toEqual([]);
  expect(internals.namedAutomatic).toBeUndefined();
  controller.dispose();
  delegation = undefined;
});

test("a refused start of a named Drift is consumed: the next check considers every eligible Drift again", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-refused-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const named = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const other = newDrift(project, { options: FIX_OPTIONS, title: "Stock differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const internals = controller as unknown as {
    deliverAutomatic(root: string, canSend: () => boolean, launch: unknown): Promise<boolean>;
    startAutomaticResolution(project: unknown, drifts: string[]): Promise<boolean>;
    eligibleDrifts(project: unknown, mode: string): string[];
    namedAutomatic: { root: string; drift: string } | undefined;
  };
  internals.namedAutomatic = { root, drift: named.id };
  internals.deliverAutomatic = async () => false;
  expect(await internals.startAutomaticResolution(project, [named.id])).toBe(false);
  expect(internals.namedAutomatic).toBeUndefined();
  expect(internals.eligibleDrifts(project, "enabled").sort()).toEqual([named.id, other.id].sort());
  controller.dispose();
  delegation = undefined;
});
