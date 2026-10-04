import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run, runAsk } from "../src/cli/main";
import { createQuestionServer, QUESTION_ENDPOINT_ENV, type QuestionServer } from "../src/core/question-channel";
import { questionAborted, type QuestionRequest, type QuestionResult } from "../src/core/questions";
import { projectAt, type Project } from "../src/core/store";

let dir: string;
let runtimeDir: string;
let project: Project;
let server: QuestionServer | undefined;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-question-tools-"));
  runtimeDir = mkdtempSync(join(tmpdir(), "trama-question-runtime-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  project = projectAt(dir);
});
afterEach(async () => {
  await server?.dispose();
  server = undefined;
  rmSync(dir, { recursive: true, force: true });
  rmSync(runtimeDir, { recursive: true, force: true });
});

const round = (id = "direction"): QuestionRequest => ({ questions: [{ id, question: "Which direction?", options: [{ label: "North", description: "Through the woods" }, { label: "South", description: "Along the coast" }], recommended: 1, multi: false }] });
interface Deferred<T> { promise: Promise<T>; resolve(value: T): void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("an invalid later question prevents admission and identifies the offending field", async () => {
  const invalid = { questions: [...round().questions, { ...round("later").questions[0], recommended: 9 }] };
  let admitted = false;
  const cli = await runAsk(["ask", "--root", dir], tmpdir(), JSON.stringify(invalid), { handler: async () => { admitted = true; throw new Error("Invalid rounds must not be admitted"); } });
  expect(admitted).toBe(false);
  expect(cli.exit).toBe(2);
  expect(JSON.parse(cli.out)).toMatchObject({ error: { code: "invalid-input", message: expect.stringContaining("questions[1].recommended") } });
});

test("`trama ask` prints the editor's answers as JSON", async () => {
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, request) => (
    { status: "answered", answers: { [request.questions[0]!.id]: { status: "answered", selected: ["South"] } } }
  ) });
  const cli = await runAsk(["ask", "--root", dir], tmpdir(), JSON.stringify(round()), { env: { [QUESTION_ENDPOINT_ENV]: server.endpoint } });
  expect(cli.exit).toBe(0);
  expect(JSON.parse(cli.out)).toEqual({ status: "answered", answers: { direction: { status: "answered", selected: ["South"] } } });
});

test("the `mcp` command no longer exists", () => {
  expect(() => run(["mcp"], dir, {})).toThrow(/Unknown command "mcp"/);
  expect(run(["--help"], dir, {}).out).not.toContain("mcp");
});


test("CLI ask routes by selected root outside cwd and emits only the interruption JSON", async () => {
  const entered = deferred<void>();
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async () => {
    entered.resolve();
    return await new Promise<QuestionResult>(() => {});
  } });
  const proc = Bun.spawn(["bun", join(import.meta.dir, "../src/cli/bin.ts"), "--root", dir, "ask"], { cwd: tmpdir(), env: { ...process.env, [QUESTION_ENDPOINT_ENV]: server.endpoint }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
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

test("CLI SIGTERM cancels the admitted round and exits with a JSON failure", async () => {
  const entered = deferred<void>();
  const cancelled = deferred<void>();
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, _request, context) => {
    entered.resolve();
    return await new Promise<QuestionResult>((_resolve, reject) => {
      context.signal?.addEventListener("abort", () => { cancelled.resolve(); reject(questionAborted()); }, { once: true });
    });
  } });
  const proc = Bun.spawn(["bun", join(import.meta.dir, "../src/cli/bin.ts"), "ask", "--root", dir], { cwd: tmpdir(), env: { ...process.env, [QUESTION_ENDPOINT_ENV]: server.endpoint }, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
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
