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

test("Resolve on one automatic-eligible Drift resumes the delegation once its collection starts", async () => {
  delegation = "enabled";
  const root = mkdtempSync(join(tmpdir(), "trama-named-resume-"));
  cpSync(join(import.meta.dir, "../examples/shop"), root, { recursive: true });
  const project = projectAt(root);
  const drift = newDrift(project, { options: FIX_OPTIONS, title: "Refund differs", refs: ["order"], happens: "The code does it one way.", should: "The Model says another.", where: "order.md" });
  const controller = new Controller({ fsPath: root } as never);
  const calls: string[] = [];
  const internals = controller as unknown as {
    ownedCoordinatorRoot: string | undefined;
    startAutomaticResolution(project: unknown, drifts: string[]): Promise<boolean>;
    resumeCoordinator(project: unknown): Promise<void>;
    launchAction(project: unknown, action: unknown): Promise<void>;
  };
  internals.ownedCoordinatorRoot = root;
  internals.startAutomaticResolution = async (_project, drifts) => {
    calls.push(`start:${drifts.join(",")}`);
    return true;
  };
  internals.resumeCoordinator = async () => {
    calls.push("resume");
  };
  await internals.launchAction(project, { kind: "resolve-drifts", drift: drift.id });
  expect(calls).toEqual([`start:${drift.id}`, "resume"]);
  controller.dispose();
  delegation = undefined;
});
