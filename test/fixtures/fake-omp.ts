// A stand-in for `omp acp --yolo` used by the tests of the ACP client: JSON-RPC lines on stdio. FAKE_OMP picks a behaviour: `silent` (never answers),
// `exit3` (exits with code 3 at once), `stubborn` (ignores SIGTERM), `plain` (no steering declared, no model option), or nothing for the full one.
import { createInterface } from "node:readline";

const mode = process.env["FAKE_OMP"] ?? "";
if (mode === "exit3") process.exit(3);
if (mode === "stubborn") process.on("SIGTERM", () => {});
if (mode === "silent") setInterval(() => {}, 1000);

const send = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`);
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
}
const textOf = (blocks: Block[]) => blocks.map((block) => (block.type === "text" ? block.text : `<${block.uri}>`)).join(" ");

async function onPrompt(id: number, params: Params) {
  const text = textOf(params.prompt);
  chunk(params.sessionId, `echo:${text}`);
  if (text.includes("form")) {
    const answer = (await ask("elicitation/create", { sessionId: params.sessionId, mode: "form", message: "Pick", requestedSchema: { type: "object", properties: { a: { type: "string" } } } })) as { action: string };
    chunk(params.sessionId, `form:${answer.action}`);
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
        agentCapabilities: { loadSession: mode !== "resume-only", sessionCapabilities: { resume: {} } },
        ...(mode === "plain" ? {} : { _meta: { steering: { supported: true } } }),
      });
    case "session/new":
      reply({ sessionId: "s-1", ...(mode === "plain" ? {} : { configOptions: configOptions() }) });
      return chunk("s-1", `started:${process.argv.slice(2).join(" ")}|${process.env["TRAMA_TERMINAL"]}|mcp=${message.params.mcpServers.length}|cwd=${process.cwd()}`);
    case "session/load":
    case "session/resume":
      if (message.method === "session/load") update(message.params.sessionId, { sessionUpdate: "user_message_chunk", content: { type: "text", text: "history" } });
      return reply({ configOptions: configOptions() });
    case "session/prompt":
      return void onPrompt(message.id!, message.params);
    case "session/cancel":
      return running?.finish("cancelled");
    case "_session/steering":
      if (running === undefined) return reply({ outcome: "promptRequired", queue: "steering" });
      chunk(message.params.sessionId, `steered:${textOf(message.params.prompt)}`);
      return reply({ outcome: "injected", queue: "steering" });
    case "session/set_config_option":
      model = message.params.value;
      return reply({ configOptions: configOptions() });
    default:
      return send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `no ${message.method}` } });
  }
});
