// The stand-in for `omp` that `scripts/screenshots.ts` puts first on the PATH of the VS Code it launches (through a small `omp` wrapper that runs this file with Bun).
// It answers what the extension asks of omp, with fixed answers, and never calls a model:
//   omp --version            the version line
//   omp update --check       "Already up to date"
//   omp models --json        the models of two logged-in providers
//   omp usage --json         the usage report of the subscriptions
//   omp auth-broker logout   nothing, successfully
//   omp [options] acp        an ACP agent that replays the recorded conversation the prompt matches (`omp-conversation.ts`)
//   omp [options] <prompt>   an agent terminal: it prints a short banner and waits until the terminal closes.
// Both kinds of job write what Trama gave them to `$OMP_STANDIN_DIR/agents/<terminal>.json`, where the scenes read the job's environment from. A conversation's turn that would stay open
// ends when a scene writes `$OMP_STANDIN_DIR/finish/<terminal>`, as an agent that has finished its work.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { TURNS } from "./omp-conversation";

const VERSION = "18.13.0";
const args = process.argv.slice(2);

const MODELS = [
  { selector: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5", provider: "anthropic", thinking: ["low", "medium", "high"] },
  { selector: "anthropic/claude-opus-5", name: "Claude Opus 5", provider: "anthropic", thinking: ["low", "medium", "high"] },
  { selector: "openai-codex/gpt-5-codex", name: "GPT-5 Codex", provider: "openai-codex", thinking: ["low", "medium", "high"] },
];

const out = (text: string): void => void process.stdout.write(`${text}\n`);

if (args[0] === "--version" || args[0] === "-v") {
  out(`omp ${VERSION}`);
} else if (args[0] === "update" && args[1] === "--check") {
  out(`Current version: ${VERSION}\nAlready up to date`);
} else if (args[0] === "models" && args.includes("--json")) {
  out(JSON.stringify({ models: MODELS }));
} else if (args[0] === "usage" && args.includes("--json")) {
  const now = Date.now();
  const limit = (label: string, windowId: string, durationMs: number, usedFraction: number, resetsIn: number) => ({ label, scope: { windowId }, window: { id: windowId, durationMs, resetsAt: now + resetsIn }, amount: { usedFraction } });
  out(JSON.stringify({ generatedAt: now, reports: [{ provider: "anthropic", limits: [limit("5h", "5h", 5 * 3_600_000, 0.18, 3 * 3_600_000), limit("7d", "7d", 7 * 86_400_000, 0.41, 3 * 86_400_000)] }] }));
} else if (args[0] === "auth-broker") {
  // logout: nothing to do.
} else if (args.includes("acp")) {
  await acp();
} else {
  await terminal();
}

/**
 * The jobs of Trama (a terminal or a conversation of omp Chat): the scenes read `agents/<terminal>.json` to run `trama` commands as this agent (its announcements, its question rounds).
 * The file says the job's `prompt` once it has one: the instruction of a job, which General (a conversation without a job) does not have until the developer writes.
 */
function recordJob(prompt?: string): void {
  const env = process.env;
  const terminal = env["TRAMA_TERMINAL"];
  const dir = env["OMP_STANDIN_DIR"];
  if (terminal === undefined || dir === undefined) return;
  mkdirSync(join(dir, "agents"), { recursive: true });
  const trama = Object.fromEntries(Object.entries(env).filter(([key, value]) => key.startsWith("TRAMA_") && value !== undefined));
  writeFileSync(join(dir, "agents", `${terminal}.json`), JSON.stringify({ terminal, startedAt: Date.now(), cwd: process.cwd(), args, env: trama, ...(prompt === undefined ? {} : { prompt }) }, null, 2));
}

/** An agent terminal: it records its job, prints a short banner and waits until the terminal closes. */
async function terminal(): Promise<void> {
  recordJob(args.filter((arg) => !arg.startsWith("-")).at(-1));
  out(`\u001b[1momp\u001b[0m ${VERSION}`);
  out("");
  const prompt = args.filter((arg) => !arg.startsWith("-")).at(-1);
  if (prompt !== undefined) out(`> ${prompt.split("\n")[0]}`);
  out("");
  setInterval(() => {}, 1 << 30);
  await new Promise(() => {});
}

/** `omp acp`: JSON-RPC lines on stdio, as the ACP client of omp Chat speaks them. */
async function acp(): Promise<void> {
  recordJob();
  let recorded = false;
  let model = MODELS[0]!.selector;
  const send = (message: unknown): void => void process.stdout.write(`${JSON.stringify(message)}\n`);
  const update = (sessionId: string, content: unknown): void => send({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update: content } });
  const configOptions = () => [{ id: "model", name: "Model", category: "model", type: "select", currentValue: model, options: MODELS.map((each) => ({ value: each.selector, name: each.name })) }];
  const reply = (id: number, result: unknown): void => send({ jsonrpc: "2.0", id, result });

  /** Resolves when a scene asks this job to end its turn (`finish/<terminal>`); never for a conversation without a job. */
  async function finished(): Promise<void> {
    const terminal = process.env["TRAMA_TERMINAL"];
    const dir = process.env["OMP_STANDIN_DIR"];
    if (terminal === undefined || dir === undefined) return new Promise(() => {});
    while (!existsSync(join(dir, "finish", terminal))) await Bun.sleep(200);
  }

  /** Replays the turn the prompt matches; a prompt no turn matches is a job at work. A turn that holds, or matches nothing, ends only when the scene finishes the job. */
  async function prompt(id: number, sessionId: string, blocks: { type: string; text?: string }[]): Promise<void> {
    const asked = blocks.map((block) => block.text ?? "").join("\n");
    if (!recorded) recordJob(asked);
    recorded = true;
    const turn = TURNS.find((each) => asked.includes(each.match));
    for (const { after, update: content } of turn?.updates ?? []) {
      await Bun.sleep(after);
      update(sessionId, content);
    }
    if (turn === undefined || turn.hold === true) await finished();
    reply(id, { stopReason: "end_turn" });
  }

  createInterface({ input: process.stdin }).on("line", (line) => {
    const message = JSON.parse(line) as { id?: number; method?: string; params?: { sessionId?: string; value?: string; prompt?: { type: string; text?: string }[] } };
    if (message.method === undefined || message.id === undefined) return;
    const sessionId = message.params?.sessionId ?? "session-1";
    switch (message.method) {
      case "initialize":
        return reply(message.id, { protocolVersion: 1, agentCapabilities: { loadSession: true, sessionCapabilities: { resume: {}, close: {} } }, _meta: { steering: { supported: true } } });
      case "session/new":
        return reply(message.id, { sessionId: "session-1", configOptions: configOptions() });
      case "session/load":
      case "session/resume":
        return reply(message.id, { configOptions: configOptions() });
      case "session/prompt":
        return void prompt(message.id, sessionId, message.params?.prompt ?? []);
      case "session/set_config_option":
        model = message.params?.value ?? model;
        return reply(message.id, { configOptions: configOptions() });
      case "session/close":
        return reply(message.id, {});
      case "_session/steering":
        return reply(message.id, { outcome: "promptRequired", queue: "steering" });
      default:
        return send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `no ${message.method}` } });
    }
  });
  await new Promise(() => {});
}
