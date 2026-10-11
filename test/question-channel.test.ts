import { afterEach, beforeEach, expect, test } from "bun:test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { acquireCoordinatorLease, askEditor, createQuestionServer, QUESTION_ENDPOINT_ENV, questionProjectId, releaseCoordinatorLease, renewCoordinatorLease, requestCoordinatorMessage, sendCoordinatorMessage, type CoordinatorJson, type CoordinatorMessage, type QuestionServer } from "../src/core/question-channel";
import { QuestionRoundQueue, type CompletedQuestionRound } from "../src/core/question-rounds";
import { QuestionInterruptedError, type QuestionHandler, type QuestionRequest } from "../src/core/questions";
import { projectAt } from "../src/core/store";

let root: string;
let projectRoot: string;
let runtimeDir: string;
let servers: QuestionServer[];
let children: ChildProcessWithoutNullStreams[];
beforeEach(() => {
  // A Unix socket path is limited to about 100 bytes; the system temp directory on macOS is already most of that.
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-qtest-") : "/tmp/trama-qtest-");
  projectRoot = join(root, "project");
  runtimeDir = join(root, "runtime");
  mkdirSync(projectRoot);
  servers = [];
  children = [];
});
afterEach(async () => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
  }
  await Promise.all(servers.map((server) => server.dispose()));
  rmSync(root, { recursive: true, force: true });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function round(id = "choice"): QuestionRequest {
  return { questions: [{ id, question: "Which change should be made?", options: [{ label: "Keep", description: "Preserve current behavior" }, { label: "Change", description: "Use the new behavior" }], recommended: 0, multi: false }] };
}

function answer(id: string, text?: string): CompletedQuestionRound {
  return { status: "answered", answers: { [id]: { status: "answered", selected: ["Change"], ...(text === undefined ? {} : { text }) } } };
}

async function server(handler: QuestionHandler, options: {
  projectRoot?: string;
  focusedAt?: number;
  windowId?: string;
  onClose?: () => void;
  onCoordinatorMessage?: (message: CoordinatorMessage) => CoordinatorJson | void | Promise<CoordinatorJson | void>;
} = {}) {
  const created = await createQuestionServer({ project: projectAt(options.projectRoot ?? projectRoot), runtimeDir, handler, windowId: options.windowId, focusedAt: options.focusedAt, onClose: options.onClose, onCoordinatorMessage: options.onCoordinatorMessage });
  servers.push(created);
  return created;
}

function ask(request: QuestionRequest, endpoint?: string, signal?: AbortSignal) {
  return askEditor(projectAt(projectRoot), request, { signal }, { runtimeDir, env: endpoint === undefined ? {} : { [QUESTION_ENDPOINT_ENV]: endpoint } });
}

function outcome<T>(promise: Promise<T>): Promise<T | Error> {
  return promise.catch((error: unknown) => {
    if (!(error instanceof Error)) throw error;
    return error;
  });
}

test("validates the complete round before routing or presenting any question", async () => {
  let presentations = 0;
  const editor = await server(async () => { presentations++; return answer("choice"); });
  const invalid = round();
  invalid.questions.push({ ...round("later").questions[0]!, recommended: 8 });
  await expect(ask(invalid, editor.endpoint)).rejects.toThrow("questions[1].recommended");
  expect(presentations).toBe(0);
});

test("a missing initial editor is unavailable, not an interrupted or answered round", async () => {
  expect(await ask(round())).toMatchObject({ status: "unavailable" });
  expect(existsSync(runtimeDir)).toBe(false);
});

test("coordinator messages reach every live same-project window without invoking question handlers", async () => {
  const received: string[] = [];
  let presentations = 0;
  await server(async () => { presentations++; return answer("choice"); }, { onCoordinatorMessage: (message) => received.push(String(message.event)) });
  await server(async () => { presentations++; return answer("choice"); }, { onCoordinatorMessage: (message) => received.push(String(message.event)) });

  expect(await sendCoordinatorMessage(projectAt(projectRoot), { event: "run-started", runId: "run-1" }, { runtimeDir })).toEqual({ delivered: 2 });
  expect(received).toEqual(["run-started", "run-started"]);
  expect(presentations).toBe(0);
});

test("coordinator requests return read-only responses from live editors", async () => {
  await server(async () => answer("choice"), {
    onCoordinatorMessage: (message) => message.type === "status-request" ? { coordinator: true, phase: "idle" } : undefined,
  });
  const responses = await requestCoordinatorMessage(projectAt(projectRoot), { type: "status-request" }, { runtimeDir });
  expect(responses).toEqual([{ coordinator: true, phase: "idle" }]);
});

test("coordinator messages report no receiver when discovery contains only stale endpoints", async () => {
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot);
  await server(async () => answer("choice"), { projectRoot: otherRoot, onCoordinatorMessage: () => { throw new Error("wrong-project delivery"); } });
  mkdirSync(runtimeDir, { recursive: true });
  const stale = process.platform === "win32" ? "\\\\.\\pipe\\trama-question-00000000-0000-0000-0000-000000000000" : join(runtimeDir, "gone.sock");
  writeFileSync(join(runtimeDir, "stale.json"), JSON.stringify({ projectId: questionProjectId(projectAt(projectRoot)), windowId: "stale", endpoint: stale, focusedAt: 1 }), { mode: 0o600 });

  expect(await sendCoordinatorMessage(projectAt(projectRoot), { event: "run-ended" }, { runtimeDir })).toEqual({ delivered: 0, error: "no-live-receiver" });
});

test("coordinator messages never cross canonical project identities", async () => {
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot);
  const received: string[] = [];
  await server(async () => answer("choice"), { onCoordinatorMessage: (message) => received.push(String(message.project)) });
  await server(async () => answer("choice"), { projectRoot: otherRoot, onCoordinatorMessage: (message) => received.push(String(message.project)) });

  expect(await sendCoordinatorMessage(projectAt(projectRoot), { project: "target" }, { runtimeDir })).toEqual({ delivered: 1 });
  expect(received).toEqual(["target"]);
});

test("coordinator lease admits one live window and release lets another acquire", async () => {
  const first = await server(async () => answer("choice"), { windowId: "first-window" });
  const second = await server(async () => answer("choice"), { windowId: "second-window" });
  const project = projectAt(projectRoot);
  const owners = [
    { windowId: "first-window", endpoint: first.endpoint },
    { windowId: "second-window", endpoint: second.endpoint },
  ];
  const [firstLease, secondLease] = await Promise.all(owners.map((owner) => acquireCoordinatorLease(project, owner, { runtimeDir })));
  expect(Number(firstLease !== null) + Number(secondLease !== null)).toBe(1);
  const lease = firstLease ?? secondLease;
  if (!lease) throw new Error("A live editor did not acquire the coordinator lease");
  expect(await renewCoordinatorLease(project, lease, { runtimeDir })).toBe(true);
  expect(await releaseCoordinatorLease(project, { ...lease, windowId: "wrong-window" }, { runtimeDir })).toBe(false);
  expect(await releaseCoordinatorLease(project, lease, { runtimeDir })).toBe(true);
  expect(await renewCoordinatorLease(project, lease, { runtimeDir })).toBe(false);
  const nextOwner = lease.windowId === owners[0]!.windowId ? owners[1]! : owners[0]!;
  expect(await acquireCoordinatorLease(project, nextOwner, { runtimeDir })).not.toBeNull();
});

test("coordinator lease reclaims a disposed owner's stale endpoint", async () => {
  const stale = await server(async () => answer("choice"), { windowId: "stale-window" });
  const project = projectAt(projectRoot);
  const lease = await acquireCoordinatorLease(project, { windowId: "stale-window", endpoint: stale.endpoint }, { runtimeDir });
  if (!lease) throw new Error("The initial live editor did not acquire the coordinator lease");
  await stale.dispose();
  const next = await server(async () => answer("choice"), { windowId: "next-window" });
  expect(await acquireCoordinatorLease(project, { windowId: "next-window", endpoint: next.endpoint }, { runtimeDir })).not.toBeNull();
});

test("coordinator leases are isolated by canonical project", async () => {
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot);
  const first = await server(async () => answer("choice"), { windowId: "first-window" });
  const other = await server(async () => answer("choice"), { projectRoot: otherRoot, windowId: "other-window" });
  const project = projectAt(projectRoot);
  const otherProject = projectAt(otherRoot);
  const lease = await acquireCoordinatorLease(project, { windowId: "first-window", endpoint: first.endpoint }, { runtimeDir });
  if (!lease) throw new Error("The first project did not acquire its coordinator lease");
  expect(await acquireCoordinatorLease(otherProject, { windowId: "other-window", endpoint: other.endpoint }, { runtimeDir })).not.toBeNull();
  expect(await acquireCoordinatorLease(project, { windowId: "other-window", endpoint: other.endpoint }, { runtimeDir })).toBeNull();
  expect(await renewCoordinatorLease(otherProject, lease, { runtimeDir })).toBe(false);
  expect(await releaseCoordinatorLease(otherProject, lease, { runtimeDir })).toBe(false);
  expect(await renewCoordinatorLease(project, lease, { runtimeDir })).toBe(true);
});

test("a stale launching endpoint is authoritative even when another project window is live", async () => {
  let presentations = 0;
  await server(async () => { presentations++; return answer("choice"); });
  const stale = process.platform === "win32" ? "\\\\.\\pipe\\trama-question-00000000-0000-0000-0000-000000000000" : join(runtimeDir, "gone.sock");
  expect(await ask(round(), stale)).toMatchObject({ status: "unavailable" });
  expect(presentations).toBe(0);
});

test("an authoritative endpoint for another project refuses without presentation or rerouting", async () => {
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot);
  let presentations = 0;
  const wrong = await server(async () => { presentations++; return answer("choice"); }, { projectRoot: otherRoot });
  await server(async () => { presentations++; return answer("choice"); });
  expect(await ask(round(), wrong.endpoint)).toMatchObject({ status: "unavailable" });
  expect(presentations).toBe(0);
});

test("a worktree of the window's repository is another project, even on a trama branch", async () => {
  const git = (cwd: string, ...args: string[]) => {
    const result = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  };
  git(projectRoot, "init", "-q");
  git(projectRoot, "commit", "-q", "--allow-empty", "-m", "start");
  const worktree = join(root, "project.trama-worktrees", "abcd1234");
  git(projectRoot, "worktree", "add", "-q", "-b", "trama/abcd1234", worktree);
  let presentations = 0;
  const editor = await server(async () => { presentations++; return answer("choice"); });
  expect(await askEditor(projectAt(worktree), round(), {}, { runtimeDir, env: { [QUESTION_ENDPOINT_ENV]: editor.endpoint } })).toMatchObject({ status: "unavailable" });
  expect(presentations).toBe(0);
});

test("discovery selects focus recency among live same-project windows, never sends rounds to probes", async () => {
  const presented: string[] = [];
  const earlier = await server(async () => { presented.push("earlier"); return answer("choice", "earlier window"); }, { focusedAt: 10 });
  await server(async () => { presented.push("later"); return answer("choice", "later window"); }, { focusedAt: 20 });
  const stale = process.platform === "win32" ? "\\\\.\\pipe\\trama-question-00000000-0000-0000-0000-000000000000" : join(runtimeDir, "stale.sock");
  writeFileSync(join(runtimeDir, "stale.json"), JSON.stringify({ projectId: questionProjectId(projectAt(projectRoot)), windowId: "stale", endpoint: stale, focusedAt: 999 }), { mode: 0o600 });
  const otherRoot = join(root, "other");
  mkdirSync(otherRoot);
  const wrong = await server(async () => { presented.push("wrong project"); return answer("choice"); }, { projectRoot: otherRoot, focusedAt: 9999 });
  // Even a misleading record cannot route a request before the live project's identity is checked.
  writeFileSync(join(runtimeDir, "mismatch.json"), JSON.stringify({ projectId: questionProjectId(projectAt(projectRoot)), windowId: "mismatch", endpoint: wrong.endpoint, focusedAt: 99999 }), { mode: 0o600 });
  expect(await ask(round())).toEqual(answer("choice", "later window"));
  await earlier.focus(30);
  expect(await ask(round())).toEqual(answer("choice", "earlier window"));
  expect(presented).toEqual(["later", "earlier"]);
});

test("the window learns whether a round comes from a Trama terminal by how it was addressed, never from discovery", async () => {
  const origins: Array<boolean | undefined> = [];
  const editor = await server(async (_project, _request, context) => { origins.push(context.fromTramaTerminal); return answer("choice"); });
  await ask(round(), editor.endpoint);
  await ask(round());
  expect(origins).toEqual([true, false]);
});

test("a round asked from the shell of Cursor's chat agent tells the window so", async () => {
  const origins: Array<[boolean | undefined, boolean | undefined]> = [];
  await server(async (_project, _request, context) => { origins.push([context.fromTramaTerminal, context.fromCursorChat]); return answer("choice"); });
  await askEditor(projectAt(projectRoot), round(), {}, { runtimeDir, env: { CURSOR_AGENT: "1" } });
  await askEditor(projectAt(projectRoot), round(), {}, { runtimeDir, env: {} });
  expect(origins).toEqual([[false, true], [false, false]]);
});

test("explicit project routing works from an unrelated caller working directory", async () => {
  await server(async () => answer("choice", "explicit project"));
  const elsewhere = join(root, "elsewhere");
  mkdirSync(elsewhere);
  const script = `import { askEditor } from ${JSON.stringify(join(import.meta.dir, "../src/core/question-channel.ts"))};
import { projectAt } from ${JSON.stringify(join(import.meta.dir, "../src/core/store.ts"))};
console.log(JSON.stringify(await askEditor(projectAt(${JSON.stringify(projectRoot)}), ${JSON.stringify(round())}, {}, {env:{},runtimeDir:${JSON.stringify(runtimeDir)}})));`;
  const child = spawn(process.execPath, ["-e", script], { cwd: elsewhere, stdio: ["pipe", "pipe", "pipe"] });
  children.push(child);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
  const [code] = await once(child, "close");
  expect(stderr).toBe("");
  expect(code).toBe(0);
  expect(JSON.parse(stdout)).toEqual(answer("choice", "explicit project"));
});

test("window shutdown interrupts its active and queued rounds without starting queued controls", async () => {
  const entered = deferred<void>();
  const queued = deferred<void>();
  const decision = deferred<CompletedQuestionRound>();
  const presented: string[] = [];
  let activeSignal: AbortSignal | undefined;
  const queue = new QuestionRoundQueue((request, context) => {
    presented.push(request.questions[0]!.id);
    activeSignal = context.signal;
    entered.resolve();
    return decision.promise;
  });
  const editor = await server((_project, request, context) => {
    const result = queue.ask(request, context);
    if (request.questions[0]!.id === "queued") queued.resolve();
    return result;
  }, { onClose: () => queue.dispose() });
  const healthy = await server(async () => answer("healthy", "another window"));
  const activeResult = outcome(ask(round("active"), editor.endpoint));
  await entered.promise;
  const queuedResult = outcome(ask(round("queued"), editor.endpoint));
  await queued.promise;
  await editor.dispose();
  expect(await activeResult).toBeInstanceOf(QuestionInterruptedError);
  expect(await queuedResult).toBeInstanceOf(QuestionInterruptedError);
  expect(activeSignal?.reason).toBeInstanceOf(QuestionInterruptedError);
  expect(presented).toEqual(["active"]);
  expect(await ask(round("healthy"), healthy.endpoint)).toEqual(answer("healthy", "another window"));
});

test("a presenter lost after wire submission cannot turn the round into initial unavailability", async () => {
  let presentations = 0;
  const queue = new QuestionRoundQueue(async () => { presentations++; return answer("choice"); });
  const editor = await server((_project, request, context) => queue.ask(request, context), { onClose: () => queue.dispose() });
  queue.dispose();
  expect(await outcome(ask(round(), editor.endpoint))).toBeInstanceOf(QuestionInterruptedError);
  expect(presentations).toBe(0);
});

// Skipped on Windows: the peer here is a Unix socket file; Windows reaches the editor through a named pipe instead.
(process.platform === "win32" ? test.skip : test)("an unavailable reply after admission cannot authorize fallback", async () => {
  const endpoint = join(root, "late-unavailable.sock");
  // The fake presenter is reached as a discovery record names it, and that record supplies the secret.
  mkdirSync(runtimeDir, { recursive: true });
  writeFileSync(join(runtimeDir, "late.json"), JSON.stringify({ projectId: questionProjectId(projectAt(projectRoot)), windowId: "lost-presenter", endpoint, focusedAt: 1, secret: "lost-presenter-secret" }), { mode: 0o600 });
  const peer = createServer((socket) => {
    const input = createInterface({ input: socket });
    socket.once("close", () => input.close());
    input.on("line", (line) => {
      const message = JSON.parse(line) as { type: string };
      if (message.type === "hello") {
        socket.write(`${JSON.stringify({ type: "ready", projectId: questionProjectId(projectAt(projectRoot)), windowId: "lost-presenter", endpoint, focusedAt: 1 })}\n`);
      } else {
        socket.end(`${JSON.stringify({ status: "unavailable", reason: "Presenter lost after admission" })}\n`);
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    peer.once("error", reject);
    peer.listen(endpoint, resolve);
  });
  chmodSync(endpoint, 0o600);
  try {
    const result = await outcome(ask(round(), endpoint));
    expect(result).toBeInstanceOf(QuestionInterruptedError);
    expect((result as QuestionInterruptedError).code).toBe("editor-interrupted");
    expect(result).not.toHaveProperty("answers");
  } finally {
    await new Promise<void>((resolve) => peer.close(() => resolve()));
  }
});

/** The secret the one live window of `runtimeDir` keeps in its discovery record. */
function windowSecret(): string {
  const [name] = readdirSync(runtimeDir).filter((file) => file.endsWith(".json"));
  const record: unknown = JSON.parse(readFileSync(join(runtimeDir, name!), "utf8"));
  if (!record || typeof record !== "object" || !("secret" in record) || typeof record.secret !== "string") throw new Error("The discovery record holds no secret");
  return record.secret;
}

/** The first line the editor sends back to a raw request, or "" when it only closes the connection. */
function firstReply(endpoint: string, line: string): Promise<string> {
  const reply = deferred<string>();
  const socket = createConnection({ path: endpoint });
  let data = "";
  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    data += chunk;
    if (data.includes("\n")) { socket.destroy(); reply.resolve(data); }
  });
  socket.on("close", () => reply.resolve(data));
  socket.on("error", reply.reject);
  socket.once("connect", () => socket.write(line));
  return reply.promise;
}

test("every request must carry the window secret, which the editor never sends back", async () => {
  const editor = await server(async () => answer("choice"));
  const secret = windowSecret();
  expect(secret).toMatch(/^[0-9a-f]{64}$/);
  const hello = { type: "hello", projectId: questionProjectId(projectAt(projectRoot)) };
  // Without the right secret the editor answers nothing and closes the connection.
  expect(await firstReply(editor.endpoint, `${JSON.stringify(hello)}\n`)).toBe("");
  expect(await firstReply(editor.endpoint, `${JSON.stringify({ ...hello, secret: "guessed" })}\n`)).toBe("");
  expect(await firstReply(editor.endpoint, "not json\n")).toBe("");
  // With it, the ready answer names the window and does not repeat the secret.
  const ready = await firstReply(editor.endpoint, `${JSON.stringify({ ...hello, secret })}\n`);
  expect(ready).not.toContain(secret);
  expect(JSON.parse(ready)).toMatchObject({ type: "ready", projectId: hello.projectId });
  expect(await ask(round())).toEqual(answer("choice"));
});

test("a discovery record without its secret does not reach the editor, by endpoint or by discovery", async () => {
  const editor = await server(async () => answer("choice"));
  const [name] = readdirSync(runtimeDir).filter((file) => file.endsWith(".json"));
  const recordPath = join(runtimeDir, name!);
  const record: Record<string, unknown> = JSON.parse(readFileSync(recordPath, "utf8"));
  writeFileSync(recordPath, JSON.stringify({ ...record, secret: undefined }), { mode: 0o600 });
  expect(await ask(round())).toMatchObject({ status: "unavailable" });
  expect(await ask(round(), editor.endpoint)).toMatchObject({ status: "unavailable" });
  rmSync(recordPath);
  expect(await ask(round(), editor.endpoint)).toMatchObject({ status: "unavailable" });
});

test("cancelling a queued caller removes only its round and preserves the oldest remaining round", async () => {
  const activeEntered = deferred<void>();
  const cancelledQueued = deferred<void>();
  const cancelledRemoved = deferred<void>();
  const followingQueued = deferred<void>();
  const followingEntered = deferred<void>();
  const activeDecision = deferred<CompletedQuestionRound>();
  const followingDecision = deferred<CompletedQuestionRound>();
  const presented: string[] = [];
  const queue = new QuestionRoundQueue((request) => {
    const id = request.questions[0]!.id;
    presented.push(id);
    if (id === "active") { activeEntered.resolve(); return activeDecision.promise; }
    followingEntered.resolve();
    return followingDecision.promise;
  });
  const editor = await server((_project, request, context) => {
    const result = queue.ask(request, context);
    if (request.questions[0]!.id === "cancelled") {
      context.signal?.addEventListener("abort", () => cancelledRemoved.resolve(), { once: true });
      cancelledQueued.resolve();
    }
    if (request.questions[0]!.id === "following") followingQueued.resolve();
    return result;
  }, { onClose: () => queue.dispose() });
  const active = outcome(ask(round("active"), editor.endpoint));
  await activeEntered.promise;
  const controller = new AbortController();
  const cancelled = outcome(ask(round("cancelled"), editor.endpoint, controller.signal));
  await cancelledQueued.promise;
  const following = outcome(ask(round("following"), editor.endpoint));
  await followingQueued.promise;
  controller.abort();
  expect(await cancelled).toMatchObject({ name: "AbortError" });
  await cancelledRemoved.promise;
  activeDecision.resolve(answer("active"));
  expect(await active).toEqual(answer("active"));
  await followingEntered.promise;
  followingDecision.resolve(answer("following", "surviving caller"));
  expect(await following).toEqual(answer("following", "surviving caller"));
  expect(presented).toEqual(["active", "following"]);
});

test("cancelling an active caller aborts its controls and advances the queue without interrupting its successor", async () => {
  const activeEntered = deferred<void>();
  const followingQueued = deferred<void>();
  const followingEntered = deferred<void>();
  const followingDecision = deferred<CompletedQuestionRound>();
  let activeSignal: AbortSignal | undefined;
  const queue = new QuestionRoundQueue((request, context) => {
    if (request.questions[0]!.id === "active") {
      activeSignal = context.signal;
      activeEntered.resolve();
      return new Promise<CompletedQuestionRound>(() => {});
    }
    followingEntered.resolve();
    return followingDecision.promise;
  });
  const editor = await server((_project, request, context) => {
    const result = queue.ask(request, context);
    if (request.questions[0]!.id === "following") followingQueued.resolve();
    return result;
  }, { onClose: () => queue.dispose() });
  const controller = new AbortController();
  const active = outcome(ask(round("active"), editor.endpoint, controller.signal));
  await activeEntered.promise;
  const following = outcome(ask(round("following"), editor.endpoint));
  await followingQueued.promise;
  controller.abort();
  expect(await active).toMatchObject({ name: "AbortError" });
  await followingEntered.promise;
  expect(activeSignal?.aborted).toBe(true);
  expect(activeSignal?.reason).toMatchObject({ name: "AbortError" });
  followingDecision.resolve(answer("following"));
  expect(await following).toEqual(answer("following"));
});

test("a crashed editor interrupts an admitted round, leaves stale discovery unavailable, and never reroutes", async () => {
  const endpoint = deferred<string>();
  const admitted = deferred<void>();
  const script = `import { createQuestionServer } from ${JSON.stringify(join(import.meta.dir, "../src/core/question-channel.ts"))};
import { projectAt } from ${JSON.stringify(join(import.meta.dir, "../src/core/store.ts"))};
const server = await createQuestionServer({project:projectAt(${JSON.stringify(projectRoot)}),runtimeDir:${JSON.stringify(runtimeDir)},handler:()=>{console.log('admitted');return new Promise(()=>{});}});
console.log(server.endpoint);`;
  const child = spawn(process.execPath, ["-e", script], { stdio: ["pipe", "pipe", "pipe"] });
  children.push(child);
  const output = createInterface({ input: child.stdout });
  output.on("line", (line) => { if (line === "admitted") admitted.resolve(); else endpoint.resolve(line); });
  child.on("error", (error) => { endpoint.reject(error); admitted.reject(error); });
  const address = await endpoint.promise;
  let rerouted = 0;
  await server(async () => { rerouted++; return answer("choice"); }, { focusedAt: 1 });
  const result = outcome(ask(round(), address));
  await admitted.promise;
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
  expect(await result).toBeInstanceOf(QuestionInterruptedError);
  expect(await ask(round(), address)).toMatchObject({ status: "unavailable" });
  expect(rerouted).toBe(0);
  // Remove the healthy window; a crash record by itself must not count as a live editor.
  await servers[0]!.dispose();
  expect(await ask(round())).toMatchObject({ status: "unavailable" });
  output.close();
});

test("the server rejects an invalid wire round before presenting even its valid first question", async () => {
  let presented = 0;
  const editor = await server(async () => { presented++; return answer("choice"); });
  const secret = windowSecret();
  const invalid = round();
  invalid.questions.push({ ...round("last").questions[0]!, multi: "yes" as unknown as boolean });
  const socket = createConnection({ path: editor.endpoint });
  const output = createInterface({ input: socket });
  const failure = deferred<unknown>();
  output.on("line", (line) => {
    const value = JSON.parse(line);
    if (value.type === "ready") socket.write(`${JSON.stringify({ type: "ask", projectId: questionProjectId(projectAt(projectRoot)), request: invalid, secret })}\n`);
    else failure.resolve(value);
  });
  await once(socket, "connect");
  socket.write(`${JSON.stringify({ type: "hello", projectId: questionProjectId(projectAt(projectRoot)), secret })}\n`);
  expect(await failure.promise).toMatchObject({ error: { code: "invalid-input", message: "questions[1].multi must be a boolean" } });
  expect(presented).toBe(0);
  socket.destroy();
  output.close();
});
test("legacy agent-alive messages are consumed without invoking activity or idle callbacks", async () => {
  let activity = 0;
  let idle = 0;
  const editor = await createQuestionServer({
    project: projectAt(projectRoot),
    runtimeDir,
    handler: async () => answer("choice"),
    onActivity: () => activity++,
    onAgentIdle: () => idle++,
  });
  servers.push(editor);
  const secret = windowSecret();
  const socket = createConnection({ path: editor.endpoint });
  const output = createInterface({ input: socket });
  const handled = deferred<void>();
  output.on("line", (line) => {
    const message = JSON.parse(line);
    if (message.type === "ready") socket.write(`${JSON.stringify({ type: "agent-alive", terminal: "legacy", projectId: questionProjectId(projectAt(projectRoot)), secret })}\n`);
    else if (message.type === "taken") handled.resolve();
  });
  await once(socket, "connect");
  socket.write(`${JSON.stringify({ type: "hello", projectId: questionProjectId(projectAt(projectRoot)), secret })}\n`);
  await handled.promise;
  expect(activity).toBe(0);
  expect(idle).toBe(0);
  socket.destroy();
  output.close();
});

test("runtime files contain routing identities only, never pending questions or completed answers", async () => {
  const secretQuestion = "private question 10ed86d0";
  const secretAnswer = "private answer e547cdcc";
  const entered = deferred<void>();
  const decision = deferred<CompletedQuestionRound>();
  const editor = await server(async () => { entered.resolve(); return decision.promise; });
  const request = round();
  request.questions[0]!.question = secretQuestion;
  const result = ask(request, editor.endpoint);
  await entered.promise;
  const checkFiles = () => {
    if (process.platform !== "win32") {
      expect(lstatSync(runtimeDir).mode & 0o777).toBe(0o700);
      expect(lstatSync(editor.endpoint).mode & 0o777).toBe(0o600);
    }
    for (const name of readdirSync(runtimeDir)) {
      const path = join(runtimeDir, name);
      if (!lstatSync(path).isFile()) continue;
      const content = readFileSync(path, "utf8");
      expect(content).not.toContain(secretQuestion);
      expect(content).not.toContain(secretAnswer);
      expect(Object.keys(JSON.parse(content)).sort()).toEqual(["endpoint", "focusedAt", "projectId", "secret", "windowId"]);
      if (process.platform !== "win32") expect(lstatSync(path).mode & 0o777).toBe(0o600);
    }
    expect(readdirSync(projectRoot)).toEqual([]);
  };
  checkFiles();
  decision.resolve(answer("choice", secretAnswer));
  expect(await result).toEqual(answer("choice", secretAnswer));
  await editor.focus(100);
  checkFiles();
  await editor.dispose();
  expect(readdirSync(runtimeDir)).toEqual([]);
});

// Skipped on Windows: POSIX mode bits on the runtime folder do not restrict access there.
(process.platform === "win32" ? test.skip : test)("insecure Unix discovery storage cannot submit questions", async () => {
  let presented = 0;
  await server(async () => { presented++; return answer("choice"); });
  chmodSync(runtimeDir, 0o755);
  expect(await ask(round())).toMatchObject({ status: "unavailable" });
  expect(presented).toBe(0);
  chmodSync(runtimeDir, 0o700);
});
