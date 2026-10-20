import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, helpFor } from "../src/cli/main";
import { createQuestionServer, type CoordinatorJson, type CoordinatorMessage, type QuestionServer } from "../src/core/question-channel";
import { projectAt } from "../src/core/store";

let root: string;
let projectRoot: string;
let runtimeDir: string;
let server: QuestionServer | undefined;

beforeEach(() => {
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-autopilot-cli-") : "/tmp/trama-ap-");
  projectRoot = join(root, "project");
  cpSync(join(import.meta.dir, "../examples/shop"), projectRoot, { recursive: true });
  runtimeDir = join(root, process.platform === "win32" ? "trama-q" : `trama-q-${process.getuid!()}`);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  rmSync(root, { recursive: true, force: true });
});

// Both commands wait for the editor; `execute` is the one way to run them.
const runAutopilot = execute;
const failure = (job: string, kind: "task" | "drift", id: string | undefined, reason: string, extra: Record<string, string> = {}) =>
  ["autopilot", "move", job, "failed", "--input", JSON.stringify({ ...(id === undefined ? {} : { [kind]: id }), reason, ...extra })];
const startServer = async (answer: (message: CoordinatorMessage) => CoordinatorJson | void) => {
  server = await createQuestionServer({ project: projectAt(projectRoot), runtimeDir, handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: answer });
};

test("autopilot show and move help, unknown flags and the old names are explicit", async () => {
  await expect(runAutopilot(["autopilot", "show", "--unknown"], projectRoot, { runtimeDir })).rejects.toThrow(/trama autopilot show has no option --unknown/);
  await expect(runAutopilot(["autopilot", "move", "job", "failed", "--unknown"], projectRoot, { runtimeDir })).rejects.toThrow(/trama autopilot move has no option --unknown/);
  expect(helpFor(["autopilot", "show", "--help"])).toContain("Usage: trama autopilot show");
  expect(helpFor(["autopilot", "show", "--help"])).toContain("job: string");
  expect(helpFor(["autopilot", "move", "--help"])).toContain("Usage: trama autopilot move <job> <state>");
  await expect(runAutopilot(["autopilot", "move", "job", "done"], projectRoot, { runtimeDir })).rejects.toThrow(/<state> must be one of failed/);
  for (const old of [["drift", "autopilot"], ["agent-event", "failed"]]) await expect(runAutopilot(old, projectRoot, { runtimeDir })).rejects.toThrow(/Unknown command|needs a verb/);
});

test("autopilot reports unavailable coordinator distinctly and exposes no scope", async () => {
  const { out } = await runAutopilot(["autopilot", "show", "--json"], projectRoot, { runtimeDir });
  expect(JSON.parse(out)).toEqual({ status: "unavailable", reason: "No project coordinator is available.", drifts: [], tasks: [] });
});

test("autopilot only returns permanent IDs authorized for the requested job", async () => {
  await startServer((message) => message.type === "autopilot-status-request" ? {
    coordinator: true, mode: "enabled", phase: "waiting", reason: "scan running", collection: "collection-1", proposal: "proposal-1",
    remoteWindow: true, authorized: message.job === "job-1", drifts: ["drift-permanent"], tasks: ["task-permanent"],
  } : undefined);
  const status = JSON.parse((await runAutopilot(["autopilot", "show", "--json"], projectRoot, { runtimeDir })).out);
  expect(status).toMatchObject({ status: "available", mode: "enabled", phase: "waiting", collection: "collection-1", proposal: "proposal-1", remoteWindow: true, drifts: [], tasks: [] });
  const scoped = JSON.parse((await runAutopilot(["autopilot", "show", "--input", '{"job":"job-1"}', "--json"], projectRoot, { runtimeDir })).out);
  expect(scoped.drifts).toEqual(["drift-permanent"]);
  expect(scoped.tasks).toEqual(["task-permanent"]);
  const unknown = JSON.parse((await runAutopilot(["autopilot", "show", "--input", '{"job":"other"}', "--json"], projectRoot, { runtimeDir })).out);
  expect(unknown.drifts).toEqual([]);
  expect(unknown.tasks).toEqual([]);
});

test("autopilot distinguishes disabled delegation", async () => {
  await startServer((message) => message.type === "autopilot-status-request" ? { coordinator: true, mode: "disabled", phase: "idle", authorized: false } : undefined);
  expect(JSON.parse((await runAutopilot(["autopilot", "show", "--json"], projectRoot, { runtimeDir })).out).status).toBe("disabled");
});

test("autopilot tells the last failed scan as information and changes no phase", async () => {
  const failed = "Scan of the System: Scan ended without a successful check";
  await startServer((message) => message.type === "autopilot-status-request" ? {
    coordinator: true, mode: "enabled", phase: "idle", reason: "Waiting for eligible Drifts", authorized: false, lastFailedScan: failed,
  } : undefined);
  const status = JSON.parse((await runAutopilot(["autopilot", "show", "--json"], projectRoot, { runtimeDir })).out);
  expect(status).toMatchObject({ status: "available", phase: "idle", reason: "Waiting for eligible Drifts", lastFailedScan: failed });
  const readable = (await runAutopilot(["autopilot", "show"], projectRoot, { runtimeDir })).out;
  expect(readable).toContain("Phase: idle");
  expect(readable).toContain(`Last failed scan: ${failed}`);
});

test("autopilot move takes one reference, a task or a drift, and a reason, and visibly fails without delivery", async () => {
  const usage = /task|drift|reason|must not be blank/;
  await expect(runAutopilot(failure("job", "drift", "d", "no", { task: "t" }), projectRoot, { runtimeDir })).rejects.toThrow(/give exactly one of task and drift/);
  await expect(runAutopilot(failure("job", "task", undefined, "no"), projectRoot, { runtimeDir })).rejects.toThrow(/give exactly one of task and drift/);
  await expect(runAutopilot(failure("job", "drift", "d", "  "), projectRoot, { runtimeDir })).rejects.toThrow(usage);
  await expect(runAutopilot(["autopilot", "move", "job", "failed", "--input", "{}"], projectRoot, { runtimeDir })).rejects.toThrow(/reason/);
  await expect(runAutopilot(["autopilot", "move", "failed"], projectRoot, { runtimeDir })).rejects.toThrow(/Usage: trama autopilot move <job> <state>/);
  await expect(runAutopilot(failure("job", "task", "t", "not applicable"), projectRoot, { runtimeDir })).rejects.toThrow(/No project autopilot coordinator accepted/);
});

test("a failure reaches the coordinator as the failed outcome of the case, with the job of the command", async () => {
  const received: CoordinatorMessage[] = [];
  await startServer((message) => {
    if (message.type !== "autopilot-failed") return;
    received.push(message);
    return { coordinator: true, received: true };
  });
  await runAutopilot(failure("job-1", "drift", "drift-1", "not applicable"), projectRoot, { runtimeDir });
  await runAutopilot(failure("job-2", "task", "task-2", "blocked"), projectRoot, { runtimeDir });
  expect(received).toEqual([
    { type: "autopilot-failed", job: "job-1", drift: "drift-1", reason: "not applicable" },
    { type: "autopilot-failed", job: "job-2", task: "task-2", reason: "blocked" },
  ]);
});

test("a failure is not accepted by an editor that is not the coordinator", async () => {
  await startServer(() => ({ received: true }));
  await expect(runAutopilot(failure("job", "task", "task", "failed"), projectRoot, { runtimeDir })).rejects.toThrow(/No project autopilot coordinator accepted/);
});

test("autopilot show reads the job of the terminal from TRAMA_JOB", async () => {
  await startServer((message) => message.type === "autopilot-status-request" ? { coordinator: true, mode: "enabled", phase: "running", authorized: message.job === "job-env", drifts: [], tasks: ["task-permanent"] } : undefined);
  const status = JSON.parse((await runAutopilot(["autopilot", "show", "--json"], projectRoot, { runtimeDir, env: { TRAMA_JOB: "job-env" } })).out);
  expect(status.tasks).toEqual(["task-permanent"]);
});
