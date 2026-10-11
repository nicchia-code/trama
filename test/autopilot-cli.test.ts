import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentEventCommand, helpFor, runAgentEvent, runAutopilot } from "../src/cli/main";
import { createQuestionServer, type CoordinatorJson, type CoordinatorMessage, type QuestionServer } from "../src/core/question-channel";
import { projectAt } from "../src/core/store";

let root: string;
let projectRoot: string;
let runtimeDir: string;
let server: QuestionServer | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "trama-autopilot-cli-"));
  projectRoot = join(root, "project");
  cpSync(join(import.meta.dir, "../examples/shop"), projectRoot, { recursive: true });
  runtimeDir = join(root, `trama-q-${process.getuid!()}`);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  rmSync(root, { recursive: true, force: true });
});

const startServer = async (answer: (message: CoordinatorMessage) => CoordinatorJson | void) => {
  server = await createQuestionServer({ project: projectAt(projectRoot), runtimeDir, handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: answer });
};

test("autopilot and failure-event help and unknown flags are explicit", async () => {
  await expect(runAutopilot(["drift", "autopilot", "--unknown"], projectRoot, { runtimeDir })).rejects.toThrow(/trama drift autopilot/);
  await expect(runAgentEvent(["agent-event", "failed", "--unknown"], projectRoot, { runtimeDir })).rejects.toThrow(/trama agent-event/);
  expect(helpFor(["drift", "autopilot", "--help"])).toContain("Usage: trama drift autopilot");
  expect(helpFor(["agent-event", "failed", "--help"])).toContain("--job <id>");
});

test("autopilot reports unavailable coordinator distinctly and exposes no scope", async () => {
  const { out } = await runAutopilot(["drift", "autopilot", "--json"], projectRoot, { runtimeDir });
  expect(JSON.parse(out)).toEqual({ status: "unavailable", reason: "No project coordinator is available.", drifts: [], tasks: [] });
});

test("autopilot only returns permanent IDs authorized for the requested job", async () => {
  await startServer((message) => message.type === "autopilot-status-request" ? {
    coordinator: true, mode: "enabled", phase: "waiting", reason: "scan running", collection: "collection-1", proposal: "proposal-1",
    remoteWindow: true, authorized: message.job === "job-1", drifts: ["drift-permanent"], tasks: ["task-permanent"],
  } : undefined);
  const status = JSON.parse((await runAutopilot(["drift", "autopilot", "--json"], projectRoot, { runtimeDir })).out);
  expect(status).toMatchObject({ status: "available", mode: "enabled", phase: "waiting", collection: "collection-1", proposal: "proposal-1", remoteWindow: true, drifts: [], tasks: [] });
  const scoped = JSON.parse((await runAutopilot(["drift", "autopilot", "--job", "job-1", "--json"], projectRoot, { runtimeDir })).out);
  expect(scoped.drifts).toEqual(["drift-permanent"]);
  expect(scoped.tasks).toEqual(["task-permanent"]);
  const unknown = JSON.parse((await runAutopilot(["drift", "autopilot", "--job", "other", "--json"], projectRoot, { runtimeDir })).out);
  expect(unknown.drifts).toEqual([]);
  expect(unknown.tasks).toEqual([]);
});

test("autopilot distinguishes disabled delegation", async () => {
  await startServer((message) => message.type === "autopilot-status-request" ? { coordinator: true, mode: "disabled", phase: "idle", authorized: false } : undefined);
  expect(JSON.parse((await runAutopilot(["drift", "autopilot", "--json"], projectRoot, { runtimeDir })).out).status).toBe("disabled");
});

test("autopilot tells the last failed scan as information and changes no phase", async () => {
  const failed = "Scan of the System: Scan ended without a successful check";
  await startServer((message) => message.type === "autopilot-status-request" ? {
    coordinator: true, mode: "enabled", phase: "idle", reason: "Waiting for eligible Drifts", authorized: false, lastFailedScan: failed,
  } : undefined);
  const status = JSON.parse((await runAutopilot(["drift", "autopilot", "--json"], projectRoot, { runtimeDir })).out);
  expect(status).toMatchObject({ status: "available", phase: "idle", reason: "Waiting for eligible Drifts", lastFailedScan: failed });
  const readable = (await runAutopilot(["drift", "autopilot"], projectRoot, { runtimeDir })).out;
  expect(readable).toContain("Phase: idle");
  expect(readable).toContain(`Last failed scan: ${failed}`);
});

test("failed agent events validate scope and visibly fail without delivery", async () => {
  expect(agentEventCommand(["agent-event", "failed"])).not.toBeNull();
  await expect(runAgentEvent(["agent-event", "failed", "--job", "job", "--drift", "d", "--task", "t", "--reason", "no"], projectRoot, { runtimeDir })).rejects.toThrow(/Usage: trama agent-event failed/);
  await expect(runAgentEvent(["agent-event", "failed", "--job", "job", "--drift", "d", "--reason", "  "], projectRoot, { runtimeDir })).rejects.toThrow(/Usage: trama agent-event failed/);
  await expect(runAgentEvent(["agent-event", "failed", "--job", "job", "--task", "t", "--reason", "not applicable"], projectRoot, { runtimeDir })).rejects.toThrow(/No project autopilot coordinator accepted/);
});

test("failed agent events are delivered to the project coordinator", async () => {
  const received: CoordinatorMessage[] = [];
  await startServer((message) => {
    if (message.type !== "autopilot-failed") return;
    received.push(message);
    return { coordinator: true, received: true };
  });
  await runAgentEvent(["agent-event", "failed", "--job", "job-1", "--drift", "drift-1", "--reason", "not applicable"], projectRoot, { runtimeDir });
  await runAgentEvent(["agent-event", "failed", "--job", "job-2", "--task", "task-2", "--reason", "blocked"], projectRoot, { runtimeDir });
  expect(received).toEqual([
    { type: "autopilot-failed", job: "job-1", drift: "drift-1", reason: "not applicable" },
    { type: "autopilot-failed", job: "job-2", task: "task-2", reason: "blocked" },
  ]);
});

test("failed events are not accepted by an editor that is not the coordinator", async () => {
  await startServer(() => ({ received: true }));
  await expect(runAgentEvent(["agent-event", "failed", "--job", "job", "--task", "task", "--reason", "failed"], projectRoot, { runtimeDir }))
    .rejects.toThrow(/No project autopilot coordinator accepted/);
});
