import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editDrift, type PreparedQuestion, preparedOutcome, preparedStatus, readyRound } from "../src/core/prepared";
import { getProposal, listProposals, newProposal } from "../src/core/proposals";
import { resolveDriftBlocker, resolveDriftInProposal, resolveDriftsBlocker } from "../src/core/resolution";
import type { QuestionRequest, QuestionResult } from "../src/core/questions";
import { type Project, projectAt } from "../src/core/store";
import { type Drift, getDrift, newDrift, newUnifiedDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { copyShop } from "./shop-project";

let asyncResolver = true;
const messages: string[] = [];
mock.module("vscode", () => ({
  window: { createWebviewPanel: () => ({}), showInformationMessage: async () => undefined, showWarningMessage: () => undefined, showErrorMessage: (m: string) => void messages.push(m) },
  workspace: {
    workspaceFolders: [],
    getWorkspaceFolder: () => undefined,
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback, inspect: (key: string) => (key === "asyncDriftResolver" && !asyncResolver ? { globalValue: false } : undefined), update: async () => undefined }),
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
const { setOmpLauncher } = await import("../extension/src/host/omp-launch");

let dir: string;
let p: Project;
beforeEach(() => {
  asyncResolver = true;
  dir = mkdtempSync(join(tmpdir(), "trama-instant-"));
  copyShop(dir);
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
  // The agent's launch starts by finding omp and checking for an update (a child process and the network): the test does not run it, it only sees that the launch is reached.
  // `setOmpLauncher` is loaded after the `vscode` mock, at the top of the file.
  let launches = 0;
  setOmpLauncher(async () => {
    launches++;
    return undefined;
  });
  const { controller, internals } = controllerAnswering(async () => { asked = true; return answered(d.id, ["Keep"]); });
  try {
    await internals.launchAction(p, { kind: "resolve-drifts", drift: d.id }).catch(() => undefined);
    expect(asked).toBe(false);
    expect(launches).toBe(1);
  } finally {
    setOmpLauncher();
    controller.dispose();
  }
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

test("the agent started from an answer is not refused for a resolution awaiting a decision; Resolve on a Drift held by a resolution is refused, with or without an answer", async () => {
  const d = preparedDrift();
  const held = preparedDrift("Held");
  newProposal(p, "Manual", "", { kind: "resolution" });
  const resolution = newProposal(p, "Holding", "", { kind: "resolution" });
  resolveDriftInProposal(p, resolution.id, held.id, { decision: "dismissed" });
  const { controller, internals } = controllerAnswering(async () => answered(d.id, ["Keep"]));
  const reasonOf = async (drift: string, answer?: { selected: string[]; text?: string }): Promise<string> => {
    try {
      await internals.launchAction(p, { kind: "resolve-drifts", drift }, answer);
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
    return "";
  };
  expect(await reasonOf(d.id, { selected: ["Keep"], text: "but log it" })).not.toContain("awaits a decision");
  expect(await reasonOf(held.id, { selected: ["Keep"], text: "but log it" })).toContain("is part of resolution");
  expect(await reasonOf(held.id)).toContain("is part of resolution");
  controller.dispose();
});

/** A unified Drift with differences A, B and C (the first two linked), each with a prepared question of three options; `prepare` lists the ones prepared. */
function preparedRound(prepare: ("A" | "B" | "C")[] = ["A", "B", "C"]) {
  const filed = (title: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
  const [a, b, c] = [filed("A"), filed("B"), filed("C")] as const;
  const difference = (d: Drift, linked: string[] = []) => ({ drift: d.id, title: d.title, refs: d.data.refs, happens: `${d.title} happens.`, should: `${d.title} should happen.`, where: "src/refund.ts", options: FIX_OPTIONS, linked });
  const unified = newUnifiedDrift(p, { title: "Together", unifies: [a.id, b.id, c.id], differences: [difference(a, [b.id]), difference(b), difference(c)] }).drift;
  const by = { A: a, B: b, C: c };
  const question = (id: string) => ({ id, question: "What should change?", options: [{ label: "Fix it", description: "a" }, { label: "Remove it", description: "b" }, { label: "Keep", description: "c" }], recommended: 0, multi: false });
  const decisions = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }];
  editDrift(p, unified.id, { prepared: { questions: prepare.map((name) => ({ difference: by[name].id, question: question(by[name].id), decisions })) } });
  return { unified, a, b, c };
}
const answers = (entries: Record<string, { status: "answered"; selected: string[]; text?: string } | { status: "skipped" }>): QuestionResult => ({ status: "answered", answers: entries });
/** Runs Resolve on `drift` with a controller that answers its round with `answer`, and collects the launches that follow. */
async function resolveRound(drift: string, answer: (request: QuestionRequest) => Promise<QuestionResult>) {
  const seen: { request?: QuestionRequest; resolving?: boolean } = {};
  const { controller, internals } = controllerAnswering(answer, seen);
  const calls: unknown[][] = [];
  const original = internals.launchAction;
  internals.launchAction = async (...args) => {
    calls.push(args);
    if (calls.length === 1) return original.call(controller, ...args);
  };
  await internals.launchAction(p, { kind: "resolve-drifts", drift });
  controller.dispose();
  return { seen, calls };
}

test("Resolve on a unified Drift whose every open difference has a valid question opens them all in one round, in the order of the differences, no agent", async () => {
  const { unified, a, b, c } = preparedRound();
  const awaiting = newProposal(p, "Manual", "", { kind: "resolution" });
  const { seen, calls } = await resolveRound(unified.id, async (request) => answers({ [request.questions[0]!.id]: { status: "answered", selected: ["Remove it"], text: "soon" }, [request.questions[1]!.id]: { status: "answered", selected: ["Fix it"] }, [request.questions[2]!.id]: { status: "skipped" } }));
  expect(seen.request?.questions.map((q) => q.id)).toEqual([a.id, b.id, c.id]);
  expect(seen.request?.questions.every((q) => !q.multi && q.recommended === 0)).toBe(true);
  expect(seen.resolving).toBe(true);
  expect(driftWork(dir).resolving).toBe(false);
  expect(calls).toHaveLength(1);
  const written = listProposals(p).filter((r) => r.data.prepared);
  expect(written).toHaveLength(1);
  expect(written[0]?.title).toBe("Resolve: Together");
  expect(written[0]?.data).toMatchObject({ status: "open", kind: "resolution", drifts: [{ drift: unified.id, difference: a.id, decision: "fix-code", option: 2, note: "soon" }, { drift: unified.id, difference: b.id, decision: "fix-code", option: 1 }] });
  // The skipped difference stays open with its question prepared, and no manual resolution was disturbed.
  expect(getDrift(p, unified.id).data.differences.map((d) => d.decision)).toEqual([null, null, null]);
  expect(getProposal(p, awaiting.id).data.status).toBe("draft");
  expect(readyRound(p, getDrift(p, unified.id)).complete).toBe(true);
});

test("every question of the round skipped, or a lost editor, writes nothing and leaves the round prepared", async () => {
  const { unified, a, b, c } = preparedRound();
  for (const answer of [async () => answers({ [a.id]: { status: "skipped" }, [b.id]: { status: "skipped" }, [c.id]: { status: "skipped" } }), async (): Promise<QuestionResult> => { throw new Error("editor lost"); }]) {
    const { calls } = await resolveRound(unified.id, answer);
    expect(calls).toHaveLength(1);
    expect(listProposals(p)).toHaveLength(0);
    expect(driftWork(dir).resolving).toBe(false);
    expect(readyRound(p, getDrift(p, unified.id)).complete).toBe(true);
  }
});

test("linked differences decided differently launch the agent with all the answers by difference and the linked flag, and nothing is written", async () => {
  const { unified, a, b, c } = preparedRound();
  const { calls } = await resolveRound(unified.id, async () => answers({ [a.id]: { status: "answered", selected: ["Fix it"] }, [b.id]: { status: "answered", selected: ["Keep"], }, [c.id]: { status: "answered", selected: ["Keep"] } }));
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[1]).toEqual({ kind: "resolve-drifts", drift: unified.id });
  expect(calls[1]?.[2]).toEqual({ answers: { [a.id]: { selected: ["Fix it"] }, [b.id]: { selected: ["Keep"] }, [c.id]: { selected: ["Keep"] } }, linked: true });
  expect(listProposals(p)).toHaveLength(0);
});

test("free text with a choice that is not a Fix option launches the agent with the answers of the round, without the linked flag", async () => {
  const { unified, a, b } = preparedRound();
  const { calls } = await resolveRound(unified.id, async () => answers({ [a.id]: { status: "answered", selected: ["Keep"], text: "but log it" }, [b.id]: { status: "answered", selected: ["Remove it"] }, [preparedRoundC(unified)]: { status: "skipped" } }));
  expect(calls[1]?.[2]).toEqual({ answers: { [a.id]: { selected: ["Keep"], text: "but log it" }, [b.id]: { selected: ["Remove it"] } }, linked: false });
  expect(listProposals(p)).toHaveLength(0);
});

const preparedRoundC = (unified: Drift): string => getDrift(p, unified.id).data.differences[2]!.drift;

test("a refused hand-over of the resolution Trama wrote launches the agent with all the answers, and the Draft is discarded", async () => {
  const { unified, a, b } = preparedRound();
  // The difference B was decided elsewhere while the round was open: its entry is refused.
  const { calls } = await resolveRound(unified.id, async () => {
    const holding = newProposal(p, "Holding", "", { kind: "resolution" });
    resolveDriftInProposal(p, holding.id, unified.id, { decision: "dismissed", difference: b.id });
    return answers({ [a.id]: { status: "answered", selected: ["Fix it"] }, [b.id]: { status: "answered", selected: ["Fix it"] } });
  });
  expect(calls).toHaveLength(2);
  expect(calls[1]?.[2]).toEqual({ answers: { [a.id]: { selected: ["Fix it"] }, [b.id]: { selected: ["Fix it"] } }, linked: false });
  expect(listProposals(p).filter((r) => r.data.prepared).map((r) => r.data.status)).toEqual(["discarded"]);
});

test("with only some differences prepared Resolve opens no round, keeps the valid questions for the agent, and a manual resolution awaiting a decision still stops it", async () => {
  const { unified, a, b } = preparedRound(["A", "C"]);
  const { controller, internals } = controllerAnswering(async () => { throw new Error("no round expected"); });
  const inner = controller as unknown as { preparedOf(project: Project, drift: string): unknown; partlyPrepared(project: Project, drift: string): boolean };
  expect(inner.preparedOf(p, unified.id)).toBeNull();
  expect(inner.partlyPrepared(p, unified.id)).toBe(true);
  newProposal(p, "Manual", "", { kind: "resolution" });
  await expect(internals.launchAction(p, { kind: "resolve-drifts", drift: unified.id })).rejects.toThrow("awaits a decision");
  editDrift(p, unified.id, { prepared: { questions: [{ difference: b.id, question: { id: b.id, question: "What?", options: [{ label: "Fix it", description: "a" }, { label: "Remove it", description: "b" }, { label: "Keep", description: "c" }], recommended: 0, multi: false }, decisions: [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }] }] } });
  expect(inner.preparedOf(p, unified.id)).not.toBeNull();
  expect(inner.partlyPrepared(p, unified.id)).toBe(false);
  expect(a.id).toBeTruthy();
  controller.dispose();
});

test("with the setting off a unified Drift opens no round and gets no partly-prepared sentence", () => {
  const { unified } = preparedRound();
  asyncResolver = false;
  const { controller } = controllerAnswering(async () => { throw new Error("no round expected"); });
  const inner = controller as unknown as { preparedOf(project: Project, drift: string): unknown; partlyPrepared(project: Project, drift: string): boolean };
  expect(inner.preparedOf(p, unified.id)).toBeNull();
  expect(inner.partlyPrepared(p, unified.id)).toBe(false);
  controller.dispose();
});
