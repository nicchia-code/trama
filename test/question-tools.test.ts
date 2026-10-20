import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute, run } from "../src/cli/main";
import { createQuestionServer, QUESTION_ENDPOINT_ENV, type QuestionServer } from "../src/core/question-channel";
import { questionAborted, type QuestionRequest, type QuestionResult } from "../src/core/questions";
import { projectAt, type Project } from "../src/core/store";

// The default runtime directory is under %LOCALAPPDATA% on Windows and under $XDG_RUNTIME_DIR elsewhere.
const RUNTIME_VARIABLE = process.platform === "win32" ? "LOCALAPPDATA" : "XDG_RUNTIME_DIR";

let dir: string;
let runtimeRoot: string;
let runtimeDir: string;
let previousRuntime: string | undefined;
let project: Project;
let server: QuestionServer | undefined;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-question-tools-"));
  // The command line finds the window's discovery record in the default runtime directory, so the tests use that one.
  runtimeRoot = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-qr-") : "/tmp/trama-qr-");
  previousRuntime = process.env[RUNTIME_VARIABLE];
  process.env[RUNTIME_VARIABLE] = runtimeRoot;
  runtimeDir = process.platform === "win32" ? join(runtimeRoot, "Trama", "questions") : join(runtimeRoot, `trama-q-${process.getuid!()}`);
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  project = projectAt(dir);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  if (previousRuntime === undefined) delete process.env[RUNTIME_VARIABLE];
  else process.env[RUNTIME_VARIABLE] = previousRuntime;
  rmSync(dir, { recursive: true, force: true });
  rmSync(runtimeRoot, { recursive: true, force: true });
});

const round = (id = "direction"): QuestionRequest => ({ questions: [{ id, question: "Which direction?", options: [{ label: "North", description: "Through the woods" }, { label: "South", description: "Along the coast" }], recommended: 1, multi: false }] });
/** `trama question new --input -` with `input` on standard input; the editor is reached through `env`. */
const ask = (input: string, env: Record<string, string | undefined> = {}) => execute(["question", "new", "--root", dir, "--input", "-"], tmpdir(), { env, stdin: async () => input });
interface Deferred<T> { promise: Promise<T>; resolve(value: T): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("an invalid later question prevents admission and identifies the offending field", async () => {
  const invalid = { questions: [...round().questions, { ...round("later").questions[0], recommended: 9 }] };
  let admitted = false;
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async () => { admitted = true; throw new Error("Invalid rounds must not be admitted"); } });
  const cli = await ask(JSON.stringify(invalid), { [QUESTION_ENDPOINT_ENV]: server.endpoint });
  expect(admitted).toBe(false);
  expect(cli.exit).toBe(2);
  expect(JSON.parse(cli.out)).toMatchObject({ error: { code: "invalid-input", message: expect.stringContaining("questions[1].recommended") } });
});

test("context and details are optional, reach the editor, and must not be blank when present", async () => {
  const rich: QuestionRequest = { questions: [{ ...round().questions[0]!, context: "We ship **twice** a week.", options: [{ label: "North", description: "Through the woods", details: "- longer\n- safer" }, { label: "South", description: "Along the coast" }] }] };
  let received: QuestionRequest | undefined;
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, request) => {
    received = request;
    return { status: "answered", answers: { direction: { status: "answered", selected: ["North"] } } };
  } });
  const cli = await ask(JSON.stringify(rich), { [QUESTION_ENDPOINT_ENV]: server.endpoint });
  expect(cli.exit).toBe(0);
  expect(JSON.parse(cli.out)).toEqual({ status: "answered", answers: { direction: { status: "answered", selected: ["North"] } } });
  expect(received).toEqual(rich);

  for (const [bad, field] of [
    [{ questions: [{ ...round().questions[0]!, context: "  \n" }] }, "questions[0].context"],
    [{ questions: [{ ...round().questions[0]!, context: 3 }] }, "questions[0].context"],
    [{ questions: [{ ...round().questions[0]!, options: [{ label: "A", description: "a", details: " " }, { label: "B", description: "b" }] }] }, "questions[0].options[0].details"],
  ] as const) {
    let admitted = false;
    const watched = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async () => { admitted = true; throw new Error("Invalid rounds must not be admitted"); } });
    try {
      const refused = await ask(JSON.stringify(bad), { [QUESTION_ENDPOINT_ENV]: watched.endpoint });
      expect(admitted).toBe(false);
      expect(refused.exit).toBe(2);
      expect(JSON.parse(refused.out)).toMatchObject({ error: { code: "invalid-input", message: expect.stringContaining(field) } });
    } finally {
      await watched.dispose();
    }
  }
});

test("`trama question new` prints the editor's answers as JSON", async () => {
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, request) => (
    { status: "answered", answers: { [request.questions[0]!.id]: { status: "answered", selected: ["South"] } } }
  ) });
  const cli = await ask(JSON.stringify(round()), { [QUESTION_ENDPOINT_ENV]: server.endpoint });
  expect(cli.exit).toBe(0);
  expect(JSON.parse(cli.out)).toEqual({ status: "answered", answers: { direction: { status: "answered", selected: ["South"] } } });
});

test("a UTF-8 byte order mark before the round on standard input is ignored", async () => {
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, request) => (
    { status: "answered", answers: { [request.questions[0]!.id]: { status: "answered", selected: ["North"] } } }
  ) });
  const cli = await ask(`\uFEFF${JSON.stringify(round())}`, { [QUESTION_ENDPOINT_ENV]: server.endpoint });
  expect(cli.exit).toBe(0);
  expect(JSON.parse(cli.out)).toEqual({ status: "answered", answers: { direction: { status: "answered", selected: ["North"] } } });
});

test("the `mcp` command no longer exists", () => {
  expect(() => run(["mcp"], dir, {})).toThrow(/Unknown command "mcp"/);
  expect(run(["--help"], dir, {}).out).not.toContain("mcp");
});


test("CLI question new routes by selected root outside cwd and emits only the interruption JSON", async () => {
  const entered = deferred<void>();
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async () => {
    entered.resolve();
    return await new Promise<QuestionResult>(() => {});
  } });
  const proc = Bun.spawn(["bun", join(import.meta.dir, "../src/cli/bin.ts"), "--root", dir, "question", "new", "--input", "-"], { cwd: tmpdir(), env: { ...process.env, [QUESTION_ENDPOINT_ENV]: server.endpoint }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  try {
    proc.stdin.write(JSON.stringify(round()));
    proc.stdin.end();
    await entered.promise;
    await server.dispose();
    const result = JSON.parse(await new Response(proc.stdout).text());
    expect(result).toEqual({ error: { code: "editor-interrupted", message: expect.any(String) } });
    expect(await proc.exited).toBe(1);
    expect(await new Response(proc.stderr).text()).toBe("");
  } finally {
    proc.kill();
    await proc.exited;
  }
});

// Skipped on Windows: SIGTERM is not a signal Windows delivers to a child; the process is terminated outright, so there is no cancellation to observe.
(process.platform === "win32" ? test.skip : test)("CLI SIGTERM cancels the admitted round and exits with a JSON failure", async () => {
  const entered = deferred<void>();
  const cancelled = deferred<void>();
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, _request, context) => {
    entered.resolve();
    return await new Promise<QuestionResult>((_resolve, reject) => {
      context.signal?.addEventListener("abort", () => { cancelled.resolve(); reject(questionAborted()); }, { once: true });
    });
  } });
  const proc = Bun.spawn(["bun", join(import.meta.dir, "../src/cli/bin.ts"), "question", "new", "--input", "-", "--root", dir], { cwd: tmpdir(), env: { ...process.env, [QUESTION_ENDPOINT_ENV]: server.endpoint }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  try {
    proc.stdin.write(JSON.stringify(round()));
    proc.stdin.end();
    await entered.promise;
    proc.kill("SIGTERM");
    await cancelled.promise;
    expect(JSON.parse(await new Response(proc.stdout).text())).toEqual({ error: { code: "cancelled", message: expect.any(String) } });
    expect(await proc.exited).toBe(1);
  } finally {
    proc.kill();
    await proc.exited;
  }
});
