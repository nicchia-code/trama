import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { createQuestionServer, settleCoordinatorMessages, type QuestionServer } from "../src/core/question-channel";
import { projectAt } from "../src/core/store";

// The default runtime directory is under %LOCALAPPDATA% on Windows and under $XDG_RUNTIME_DIR elsewhere.
const RUNTIME_VARIABLE = process.platform === "win32" ? "LOCALAPPDATA" : "XDG_RUNTIME_DIR";

let root: string;
let projectRoot: string;
let runtimeDir: string;
let previousRuntimeDir: string | undefined;
let server: QuestionServer | undefined;

beforeEach(() => {
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-task-filed-") : "/tmp/trama-tf-");
  projectRoot = join(root, "project");
  cpSync(join(import.meta.dir, "../examples/shop"), projectRoot, { recursive: true });
  previousRuntimeDir = process.env[RUNTIME_VARIABLE];
  process.env[RUNTIME_VARIABLE] = root;
  runtimeDir = process.platform === "win32" ? join(root, "Trama", "questions") : join(root, `trama-q-${process.getuid!()}`);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  if (previousRuntimeDir === undefined) delete process.env[RUNTIME_VARIABLE];
  else process.env[RUNTIME_VARIABLE] = previousRuntimeDir;
  rmSync(root, { recursive: true, force: true });
});

test("a Task filed by an agent in a Trama terminal is relayed with its holder and never waits", async () => {
  const received: Record<string, unknown>[] = [];
  server = await createQuestionServer({ project: projectAt(projectRoot), runtimeDir, handler: async () => ({ status: "unavailable", reason: "No project coordinator is available." }), onCoordinatorMessage: (message) => { received.push(message); } });
  const result = run(["task", "new", "--json", "--input", '{"title":"Filed by agent","technical":true}'], projectRoot, { TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123" });
  expect(result.exit).toBe(0);
  const id = (JSON.parse(result.out) as { id: string }).id;
  await settleCoordinatorMessages();
  expect(received).toEqual([{ type: "task-filed", root: projectRoot, task: id, holder: "abc123" }]);
});

test("a Task filed without an agent sends nothing, and without a live editor the command still succeeds", () => {
  const result = run(["task", "new", "--json", "--input", '{"title":"Filed by a developer","technical":true}'], projectRoot, {});
  expect(result.exit).toBe(0);
});
