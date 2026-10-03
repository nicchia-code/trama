import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { runAsk } from "../src/cli/main";
import { askEditor, createQuestionServer, QUESTION_ENDPOINT_ENV, type QuestionServer } from "../src/core/question-channel";
import { questionAborted, type QuestionRequest, type QuestionResult } from "../src/core/questions";
import { projectAt, type Project } from "../src/core/store";
import { callTool } from "../src/tools/catalog";
import { serveMcp } from "../src/tools/mcp";

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
  const outcome = await callTool(project, "trama_ask", invalid, { questionHandler: async () => { admitted = true; throw new Error("Invalid rounds must not be admitted"); } });
  expect(admitted).toBe(false);
  expect(outcome.isError).toBe(true);
  expect(JSON.parse(outcome.text)).toMatchObject({ error: { code: "invalid-input", message: expect.stringContaining("questions[1].recommended") } });
  const cli = await runAsk(["ask", "--root", dir], tmpdir(), JSON.stringify(invalid));
  expect(cli.exit).toBe(2);
  expect(JSON.parse(cli.out)).toEqual(JSON.parse(outcome.text));
});

test("the offered ask tool returns initial unavailability without an editor", async () => {
  const outcome = await callTool(project, "trama_ask", round());
  expect(outcome.isError).toBe(false);
  expect(JSON.parse(outcome.text)).toMatchObject({ status: "unavailable", reason: expect.any(String) });
});

test("MCP dispatch remains responsive, cancellation affects one request, and interruption leaves MCP usable", async () => {
  const firstEntered = deferred<void>();
  const secondEntered = deferred<void>();
  const firstCancelled = deferred<void>();
  const agents: string[] = [];
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, request, context) => {
    agents.push(context.agent);
    const first = request.questions[0]?.id === "first";
    (first ? firstEntered : secondEntered).resolve();
    return await new Promise<QuestionResult>((_resolve, reject) => {
      context.signal?.addEventListener("abort", () => { if (first) firstCancelled.resolve(); reject(questionAborted()); }, { once: true });
    });
  } });
  const endpoint = server.endpoint;
  const input = new PassThrough();
  const responses = new Map<number, unknown>();
  const awaiting = new Map<number, Deferred<unknown>>();
  const response = (id: number) => {
    if (responses.has(id)) return Promise.resolve(responses.get(id));
    const waiter = deferred<unknown>();
    awaiting.set(id, waiter);
    return waiter.promise;
  };
  const serving = serveMcp(() => project, "test", input, (line) => {
    const reply = JSON.parse(line);
    responses.set(reply.id, reply);
    awaiting.get(reply.id)?.resolve(reply);
  }, { questionHandler: (p, request, context) => askEditor(p, request, context, { env: { [QUESTION_ENDPOINT_ENV]: endpoint }, runtimeDir: runtimeDir }) });
  const send = (message: unknown) => input.write(`${JSON.stringify(message)}\n`);
  try {
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { clientInfo: { name: "Test agent" } } });
    await response(1);
    send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "trama_ask", arguments: round("first") } });
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "trama_ask", arguments: round("second") } });
    await Promise.all([firstEntered.promise, secondEntered.promise]);
    send({ jsonrpc: "2.0", id: 4, method: "ping" });
    expect(await response(4)).toMatchObject({ id: 4, result: {} });
    send({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 2 } });
    await firstCancelled.promise;
    expect(await response(2)).toMatchObject({ result: { isError: true, content: [{ text: expect.stringContaining('"code":"cancelled"') }] } });
    expect(responses.has(3)).toBe(false);
    await server.dispose();
    const interrupted = await response(3) as { result: { isError: boolean; content: { text: string }[] } };
    expect(interrupted.result.isError).toBe(true);
    expect(JSON.parse(interrupted.result.content[0]!.text)).toEqual({ error: { code: "editor-interrupted", message: expect.any(String) } });
    send({ jsonrpc: "2.0", id: 5, method: "ping" });
    expect(await response(5)).toMatchObject({ id: 5, result: {} });
    expect(agents).toEqual(["Test agent", "Test agent"]);
  } finally {
    input.end();
    await serving;
  }
});

test("MCP output disconnection aborts an admitted round and stops serving", async () => {
  const entered = deferred<void>();
  const cancelled = deferred<void>();
  server = await createQuestionServer({ project, runtimeDir: runtimeDir, handler: async (_p, _request, context) => {
    entered.resolve();
    return await new Promise<QuestionResult>((_resolve, reject) => {
      context.signal?.addEventListener("abort", () => { cancelled.resolve(); reject(questionAborted()); }, { once: true });
    });
  } });
  const endpoint = server.endpoint;
  const input = new PassThrough();
  const output = new PassThrough();
  const serving = serveMcp(() => project, "test", input, undefined, { output, questionHandler: (p, request, context) => askEditor(p, request, context, { env: { [QUESTION_ENDPOINT_ENV]: endpoint }, runtimeDir: runtimeDir }) });
  input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "trama_ask", arguments: round() } })}\n`);
  await entered.promise;
  output.destroy();
  await cancelled.promise;
  await serving;
  input.destroy();
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
