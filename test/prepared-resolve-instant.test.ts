import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editDrift, type PreparedQuestion, preparedOutcome, preparedStatus } from "../src/core/prepared";
import { getProposal, listProposals, newProposal } from "../src/core/proposals";
import { resolveDriftBlocker, resolveDriftsBlocker } from "../src/core/resolution";
import type { QuestionRequest, QuestionResult } from "../src/core/questions";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";

let asyncResolver = true;
const messages: string[] = [];
mock.module("vscode", () => ({
  window: { createWebviewPanel: () => ({}), showInformationMessage: async () => undefined, showWarningMessage: () => undefined, showErrorMessage: (m: string) => void messages.push(m) },
  workspace: {
    workspaceFolders: [],
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback, inspect: (key: string) => (key === "asyncDriftResolver" && asyncResolver ? { globalValue: true } : undefined), update: async () => undefined }),
  },
  extensions: { getExtension: () => undefined },
  ConfigurationTarget: { Global: 1, Workspace: 2 },
  Uri: { joinPath: (base: { fsPath: string }, ...parts: string[]) => ({ fsPath: join(base.fsPath, ...parts) }), file: (path: string) => ({ fsPath: path }), parse: (value: string) => ({ toString: () => value }) },
  ViewColumn: { Active: 1, Beside: -2 },
  commands: { executeCommand: async () => undefined },
  env: { appName: "Visual Studio Code", openExternal: async () => true },
  Disposable: class { constructor(readonly dispose: () => void) {} },
}));
const { Controller } = await import("../extension/src/host/controller");
const { driftWork, localProjectJobs } = await import("../extension/src/host/drift-resolution");
const { agentName } = await import("../extension/src/host/agent");

let dir: string;
let p: Project;
beforeEach(() => {
  asyncResolver = true;
  dir = mkdtempSync(join(tmpdir(), "trama-instant-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
afterAll(() => mock.restore());

const preparedDrift = (title = "Late refund") => {
  const d = newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
  const question = {
    id: d.id, question: "What should change?",
    options: [{ label: "Fix it", description: "a" }, { label: "Remove it", description: "b" }, { label: "Keep", description: "c" }],
    recommended: 0, multi: false,
  };
  editDrift(p, d.id, { prepared: { question, decisions: [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }] } });
  return d;
};
const valueOf = (id: string): PreparedQuestion => {
  const status = preparedStatus(p, getDrift(p, id));
  if (status?.state !== "valid") throw new Error("not valid");
  return status.value;
};

test("preparedOutcome: a Fix option, with or without a note, is written as fix-code", () => {
  const d = preparedDrift();
  const v = valueOf(d.id);
  expect(preparedOutcome(v, { status: "answered", selected: ["Remove it"] })).toEqual({ kind: "write", answer: { decision: "fix-code", option: 2 } });
  expect(preparedOutcome(v, { status: "answered", selected: ["Fix it"], text: "  soon\n" })).toEqual({ kind: "write", answer: { decision: "fix-code", option: 1, note: "soon" } });
});

test("preparedOutcome: dismissed without text is written, with text or with no listed option it needs the agent, a skip does nothing", () => {
  const v = valueOf(preparedDrift().id);
  expect(preparedOutcome(v, { status: "answered", selected: ["Keep"] })).toEqual({ kind: "write", answer: { decision: "dismissed" } });
  expect(preparedOutcome(v, { status: "answered", selected: ["Keep"], text: "but log it" })).toEqual({ kind: "agent", answer: { selected: ["Keep"], text: "but log it" } });
  expect(preparedOutcome(v, { status: "answered", selected: [], text: "something else" })).toEqual({ kind: "agent", answer: { selected: [], text: "something else" } });
  expect(preparedOutcome(v, { status: "skipped" })).toEqual({ kind: "none" });
  expect(preparedOutcome(v, undefined)).toEqual({ kind: "none" });
});

test("a valid prepared question is not stopped by a resolution awaiting a decision; the others are", () => {
  const d = preparedDrift();
  const manual = newProposal(p, "Manual", "", { kind: "resolution" });
  const free = { resolving: false, running: false };
  expect(resolveDriftBlocker(p, free, false)).toContain(`resolving Drifts awaits a decision`);
  expect(resolveDriftBlocker(p, free, false, true)).toBeNull();
  expect(resolveDriftBlocker(p, { resolving: true, running: true }, false, true)).toBe("Drifts are being resolved. A run is in progress");
  expect(getProposal(p, manual.id).data.status).toBe("draft");
  expect(resolveDriftsBlocker(p, free)).not.toBeNull();
  expect(d.id).toBeTruthy();
});

test("the round of a prepared question is labelled Prepared question", () => {
  expect(agentName({ prepared: true })).toBe("Prepared question");
  expect(agentName({})).toBeNull();
});

/** A controller whose prepared round is answered by `answer`; `seen` collects what it was asked and the work in progress then. */
function controllerAnswering(answer: (request: QuestionRequest) => Promise<QuestionResult>, seen: { request?: QuestionRequest; resolving?: boolean; jobs?: number } = {}) {
  const controller = new Controller({ fsPath: dir } as never);
  const internals = controller as unknown as { askPrepared: (root: string, request: QuestionRequest) => Promise<QuestionResult>; launchAction: (...args: unknown[]) => Promise<void>; refresh(): void };
  internals.askPrepared = async (_root, request) => {
    seen.request = request;
    seen.resolving = driftWork(dir).resolving;
    seen.jobs = localProjectJobs(dir).length;
    return answer(request);
  };
  return { controller, internals, seen };
}

const answered = (id: string, selected: string[], text?: string): QuestionResult => ({ status: "answered", answers: { [id]: { status: "answered", selected, ...(text === undefined ? {} : { text }) } } });

test("Resolve opens the prepared question at once and a Fix option becomes a delivered prepared resolution, no agent", async () => {
  const d = preparedDrift();
  const other = preparedDrift("Other");
  const awaiting = newProposal(p, "Manual", "", { kind: "resolution" });
  const { controller, internals, seen } = controllerAnswering(async (r) => answered(r.questions[0]!.id, ["Remove it"], "by friday"));
  const launched: unknown[][] = [];
  const original = internals.launchAction.bind(controller);
  internals.launchAction = async (...args) => { launched.push(args); return original(...(args as [never, never])); };
  await original(p as never, { kind: "resolve-drifts", drift: d.id } as never);
  expect(seen.request?.questions).toHaveLength(1);
  expect(seen.request?.questions[0]?.id).toBe(d.id);
  expect(seen.resolving).toBe(true);
  expect(seen.jobs).toBe(1);
  // The work is over when the round closes.
  expect(driftWork(dir).resolving).toBe(false);
  const written = listProposals(p).filter((r) => r.data.prepared);
  expect(written).toHaveLength(1);
  expect(written[0]?.title).toBe("Resolve: Late refund");
  expect(written[0]?.data).toMatchObject({ status: "open", kind: "resolution", drifts: [{ drift: d.id, decision: "fix-code", option: 2, note: "by friday" }] });
  expect(launched).toHaveLength(0);
  // The other Drift and the manual resolution awaiting are untouched.
  expect(getProposal(p, awaiting.id).data.status).toBe("draft");
  expect(getDrift(p, other.id).data.status).toBe("open");
  controller.dispose();
});

test("two prepared resolutions wait together", async () => {
  const a = preparedDrift("A");
  const b = preparedDrift("B");
  const { controller, internals } = controllerAnswering(async (r) => answered(r.questions[0]!.id, ["Keep"]));
  await (internals.launchAction as (...a: unknown[]) => Promise<void>).call(controller, p, { kind: "resolve-drifts", drift: a.id });
  await (internals.launchAction as (...a: unknown[]) => Promise<void>).call(controller, p, { kind: "resolve-drifts", drift: b.id });
  const open = listProposals(p).filter((r) => r.data.prepared && r.data.status === "open");
  expect(open.map((r) => r.data.drifts[0]?.drift).sort()).toEqual([a.id, b.id].sort());
  controller.dispose();
});

test("a skipped question and a lost editor write nothing and leave the question prepared", async () => {
  const d = preparedDrift();
  for (const answer of [async (): Promise<QuestionResult> => ({ status: "answered", answers: { [d.id]: { status: "skipped" } } }), async (): Promise<QuestionResult> => { throw new Error("editor lost"); }]) {
    const { controller, internals } = controllerAnswering(answer);
    await (internals.launchAction as (...a: unknown[]) => Promise<void>).call(controller, p, { kind: "resolve-drifts", drift: d.id });
    expect(listProposals(p)).toHaveLength(0);
    expect(driftWork(dir).resolving).toBe(false);
    expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("valid");
    controller.dispose();
  }
});

test("free text with a non-Fix option launches the agent with the answer, and does not ask again", async () => {
  const d = preparedDrift();
  const { controller, internals } = controllerAnswering(async (r) => answered(r.questions[0]!.id, ["Keep"], "but log it\nalways"));
  const calls: unknown[][] = [];
  const original = internals.launchAction;
  internals.launchAction = async (...args) => {
    calls.push(args);
    if (calls.length === 1) return original.call(controller, ...args);
  };
  await internals.launchAction(p, { kind: "resolve-drifts", drift: d.id });
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[1]).toEqual({ kind: "resolve-drifts", drift: d.id });
  expect(calls[1]?.[2]).toEqual({ selected: ["Keep"], text: "but log it\nalways" });
  expect(listProposals(p)).toHaveLength(0);
  controller.dispose();
});

test("a stale question takes today's path: no round is asked", async () => {
  const d = preparedDrift();
  // Changing the Model's text under the Drift's references makes the question stale.
  const file = join(dir, ".trama/model/checkout/order.md");
  await Bun.write(file, (await Bun.file(file).text()).replace("refunds the customer.", "refunds the customer fully."));
  expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("stale");
  let asked = false;
  const { controller, internals } = controllerAnswering(async () => { asked = true; return answered(d.id, ["Keep"]); });
  await internals.launchAction(p, { kind: "resolve-drifts", drift: d.id }).catch(() => undefined);
  expect(asked).toBe(false);
  controller.dispose();
});

test("with the setting off Resolve does not open the prepared question", async () => {
  const d = preparedDrift();
  asyncResolver = false;
  let asked = false;
  const { controller, internals } = controllerAnswering(async () => { asked = true; return answered(d.id, ["Keep"]); });
  await internals.launchAction(p, { kind: "resolve-drifts", drift: d.id }).catch(() => undefined);
  expect(asked).toBe(false);
  controller.dispose();
});

test("while a prepared job is open, Run, Run all and Resolve on other Drifts are blocked with the resolving reason", async () => {
  const { runWindowBlocker } = await import("../src/core/resolution");
  const { startJob, endHeldJob } = await import("../extension/src/host/drift-resolution");
  const preparedJob = startJob("prepared", dir, { held: true }) as string;
  const work = driftWork(dir);
  expect(work).toEqual({ resolving: true, running: false });
  expect(runWindowBlocker(work)).toBe("Drifts are being resolved");
  expect(resolveDriftBlocker(p, work, false)).toBe("Drifts are being resolved");
  endHeldJob(dir, preparedJob);
  expect(driftWork(dir).resolving).toBe(false);
});
