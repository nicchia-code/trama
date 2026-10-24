// A stand-in for `omp acp --yolo` used by the tests of the ACP client: JSON-RPC lines on stdio. FAKE_OMP picks a behaviour: `silent` (never answers
// `initialize`), `slow-new` (never answers `session/new`), `exit3` (writes to stderr and exits with code 3 at once), `stubborn` (ignores SIGTERM), `no-steering`,
// `no-close`, `no-load` and `no-model` (one thing omp 18.12.6 declares is missing), `children` (starts a command that obeys SIGTERM) and `orphan` (starts one that
// ignores it), or nothing for the full one. A prompt with `die`, `refuse`, `refusal` or `tokens` in its text ends the process or the turn in the way it says.
// FAKE_OMP_LOG is a file where the fake writes what it received (`session/cancel`, `session/close`) and SIGTERM; FAKE_OMP_CHILD one where it writes the pid of its command.
import { dlopen } from "bun:ffi";
import { spawn } from "node:child_process";
import { appendFileSync, writeFileSync, writeSync } from "node:fs";
import { createInterface } from "node:readline";

const mode = process.env["FAKE_OMP"] ?? "";
// `close(2)` of the C library: Bun keeps its own handle on fd 1, so only closing the descriptor itself closes the pipe for the client.
const libc = () => dlopen(process.platform === "darwin" ? "libSystem.B.dylib" : "libc.so.6", { close: { args: ["i32"], returns: "i32" } });
const log = (line: string) => {
  const file = process.env["FAKE_OMP_LOG"];
  if (file !== undefined) appendFileSync(file, `${line}\n`);
};
if (mode === "exit3") {
  process.stderr.write("boom: no credentials\n");
  process.exit(3);
}
process.on("SIGTERM", () => {
  log("SIGTERM");
  if (mode === "stubborn") return;
  process.exit(0);
});
if (mode === "silent") setInterval(() => {}, 1000);
if (mode === "children" || mode === "orphan") {
  // A command omp started: it stays in omp's process group.
  const script = mode === "orphan" ? 'trap "" TERM; while true; do sleep 1; done' : "exec sleep 60";
  const command = spawn("sh", ["-c", script], { stdio: "ignore" });
  writeFileSync(process.env["FAKE_OMP_CHILD"] ?? "/dev/null", String(command.pid));
}

const send = (message: unknown) => writeSync(1, `${JSON.stringify(message)}\n`);
const update = (sessionId: string, update: unknown) => send({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update } });
const chunk = (sessionId: string, text: string) => update(sessionId, { sessionUpdate: "agent_message_chunk", content: { type: "text", text } });

const pending = new Map<number, (result: unknown) => void>();
let nextId = 1000;
function ask(method: string, params: unknown): Promise<unknown> {
  const { promise, resolve } = Promise.withResolvers<unknown>();
  const id = nextId++;
  pending.set(id, resolve);
  send({ jsonrpc: "2.0", id, method, params });
  return promise;
}

let model = "m/one";
const configOptions = () => [{ id: "model", name: "Model", category: "model", type: "select", currentValue: model, options: [{ value: "m/one", name: "One" }, { value: "m/two", name: "Two" }] }];
let running: { id: number; sessionId: string; finish: (reason: string) => void } | undefined;
// Messages sent with `queue: "followUp"` while a turn runs: omp shows each one and answers it at the end of that turn.
const followUps: string[] = [];

interface Block {
  type: string;
  text?: string;
  uri?: string;
}
interface Params {
  sessionId: string;
  prompt: Block[];
  value: string;
  mcpServers: unknown[];
  _meta?: { steering?: { queue?: string } };
}
const textOf = (blocks: Block[]) => blocks.map((block) => (block.type === "text" ? block.text : `<${block.uri}>`)).join(" ");

async function onPrompt(id: number, params: Params) {
  const text = textOf(params.prompt);
  chunk(params.sessionId, `echo:${text}`);
  if (text.includes("die")) {
    process.stderr.write("fatal: out of memory\n");
    process.exit(2);
  }
  if (text.includes("refuse")) {
    send({ jsonrpc: "2.0", id, error: { code: -32000, message: "no credentials" } });
    return;
  }
  if (text.includes("refusal") || text.includes("tokens")) {
    send({ jsonrpc: "2.0", id, result: { stopReason: text.includes("refusal") ? "refusal" : "max_tokens" } });
    return;
  }
  if (text.includes("closeconn")) {
    // The connection closes and the process stays: nothing says it ended.
    libc().symbols.close(1);
    return;
  }
  if (text.includes("form")) {
    const answer = (await ask("elicitation/create", { sessionId: params.sessionId, mode: "form", message: "Pick", requestedSchema: { type: "object", properties: { a: { type: "string" } } } })) as { action: string; _meta?: { message?: string } };
    chunk(params.sessionId, `form:${answer.action}`);
    if (answer._meta?.message !== undefined) chunk(params.sessionId, `form-message:${answer._meta.message}`);
  }
  if (text.includes("permend")) {
    // The turn ends while the request still waits (after a moment, for a message to be held behind it): the host closes it as cancelled.
    void ask("session/request_permission", {
      sessionId: params.sessionId,
      toolCall: { toolCallId: "t" },
      options: [{ optionId: "no", name: "No", kind: "reject_once" }, { optionId: "once", name: "Once", kind: "allow_once" }],
    }).then((answer) => chunk(params.sessionId, `permend:${(answer as { outcome: { outcome: string } }).outcome.outcome}`));
    setTimeout(() => send({ jsonrpc: "2.0", id, result: { stopReason: "end_turn" } }), 300);
    return;
  }
  if (text.includes("perm")) {
    const answer = (await ask("session/request_permission", {
      sessionId: params.sessionId,
      toolCall: { toolCallId: "t" },
      options: [{ optionId: "no", name: "No", kind: "reject_once" }, { optionId: "once", name: "Once", kind: "allow_once" }, { optionId: "always", name: "Always", kind: "allow_always" }],
    })) as { outcome: { optionId?: string } };
    chunk(params.sessionId, `perm:${answer.outcome.optionId}`);
  }
  if (text.includes("slow")) {
    const turn = Promise.withResolvers<string>();
    running = { id, sessionId: params.sessionId, finish: turn.resolve };
    setTimeout(() => turn.resolve("end_turn"), 1500);
    const reason = await turn.promise;
    running = undefined;
    for (const text of followUps.splice(0)) {
      update(params.sessionId, { sessionUpdate: "user_message_chunk", content: { type: "text", text } });
      chunk(params.sessionId, `echo:${text}`);
    }
    send({ jsonrpc: "2.0", id, result: { stopReason: reason } });
    return;
  }
  send({ jsonrpc: "2.0", id, result: { stopReason: "end_turn" } });
}

createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line) as { id?: number; method?: string; params: Params; result?: unknown };
  if (message.method === undefined) {
    pending.get(message.id!)?.(message.result);
    pending.delete(message.id!);
    return;
  }
  const reply = (result: unknown) => send({ jsonrpc: "2.0", id: message.id, result });
  switch (message.method) {
    case "initialize":
      if (mode === "silent") return;
      return reply({
        protocolVersion: 1,
        agentCapabilities: { loadSession: mode !== "no-load", sessionCapabilities: { resume: {}, ...(mode === "no-close" ? {} : { close: {} }) } },
        ...(mode === "no-steering" ? {} : { _meta: { steering: { supported: true } } }),
      });
    case "session/new":
      if (mode === "slow-new") return;
      reply({ sessionId: "s-1", ...(mode === "no-model" ? {} : { configOptions: configOptions() }) });
      return chunk("s-1", `started:${process.argv.slice(2).join(" ")}|${process.env["TRAMA_TERMINAL"]}|mcp=${message.params.mcpServers.length}|cwd=${process.cwd()}`);
    case "session/load":
    case "session/resume":
      if (message.method === "session/load") update(message.params.sessionId, { sessionUpdate: "user_message_chunk", content: { type: "text", text: "history" } });
      return reply({ configOptions: configOptions() });
    case "session/prompt":
      return void onPrompt(message.id!, message.params);
    case "session/cancel":
      log("session/cancel");
      return running?.finish("cancelled");
    case "session/close":
      log("session/close");
      return mode === "no-close-answer" ? undefined : reply({});
    case "_session/steering": {
      if (running === undefined) return reply({ outcome: "promptRequired", queue: "steering" });
      const text = textOf(message.params.prompt);
      if (message.params._meta?.steering?.queue === "followUp") {
        followUps.push(text);
        return reply({ outcome: "injected", queue: "followUp" });
      }
      chunk(message.params.sessionId, `steered:${text}`);
      return reply({ outcome: "injected", queue: "steering" });
    }
    case "session/set_config_option":
      model = message.params.value;
      return reply({ configOptions: configOptions() });
    default:
      return send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `no ${message.method}` } });
  }
});
