import { createInterface } from "node:readline";
import type { QuestionHandler } from "../core/questions";
import type { Project } from "../core/store";
import { callTool, TOOLS, type ToolOptions } from "./catalog";

/**
 * A Model Context Protocol server over stdio (newline-delimited JSON-RPC 2.0) exposing the Trama tools, for agents
 * outside VS Code's native tools: Cursor, Claude Code, Codex, omp. Only `initialize`, `ping`, `tools/list` and
 * `tools/call` are implemented; Trama has no resources or prompts.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface Request {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type Response = { jsonrpc: "2.0"; id: string | number | null; result: unknown } | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

const ok = (id: Request["id"], result: unknown): Response => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: Request["id"], code: number, message: string): Response => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Answers one decoded message. Notifications (no `id`) get no answer. */
export async function handleMcp(message: unknown, project: () => Project, version: string, options: ToolOptions = {}): Promise<Response | null> {
  if (typeof message !== "object" || message === null || Array.isArray(message)) return fail(null, -32600, "Invalid Request");
  const req = message as Request;
  const isNotification = !("id" in req);
  if (typeof req.method !== "string") return isNotification ? null : fail(req.id, -32600, "Invalid Request");
  if (isNotification) return null;

  switch (req.method) {
    case "initialize": {
      const asked = req.params?.["protocolVersion"];
      const protocolVersion = typeof asked === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : SUPPORTED_PROTOCOL_VERSIONS[0];
      return ok(req.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "trama", version },
        instructions: "Tools to read and change this project's Trama Model (the source of truth for its behaviour), Proposals, Tasks and Drifts. The developer approves Proposals and resolves Drifts; agents cannot.",
      });
    }
    case "ping":
      return ok(req.id, {});
    case "tools/list":
      return ok(req.id, {
        tools: TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: { readOnlyHint: !t.writes, destructiveHint: false, openWorldHint: false } })),
      });
    case "tools/call": {
      const name = req.params?.["name"];
      if (typeof name !== "string") return fail(req.id, -32602, "tools/call needs a tool name");
      const outcome = await callTool(project, name, req.params?.["arguments"], options);
      return ok(req.id, { content: [{ type: "text", text: outcome.text }], isError: outcome.isError });
    }
    default:
      return fail(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export interface McpOptions {
  questionHandler?: QuestionHandler;
  /** The agent terminal the server's agent runs in (`TRAMA_TERMINAL`). */
  terminal?: string;
  output?: NodeJS.WritableStream;
}

/** Dispatch concurrently so a pending question does not block ping, tools or cancellation. */
export async function serveMcp(project: () => Project, version: string, input: NodeJS.ReadableStream = process.stdin, write?: (line: string) => void, options: McpOptions = {}): Promise<void> {
  const output = options.output ?? (write ? undefined : process.stdout);
  const send = write ?? ((line: string) => { output?.write(line); });
  const pending = new Map<string | number | null, AbortController>();
  const lines = createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY });
  let connected = true;
  let agent = "MCP client";
  const disconnect = () => {
    if (!connected) return;
    connected = false;
    for (const controller of pending.values()) controller.abort();
    pending.clear();
    lines.close();
  };
  const reply = (response: Response) => {
    if (!connected) return;
    try { send(`${JSON.stringify(response)}\n`); }
    catch { disconnect(); }
  };
  input.on("error", disconnect);
  output?.on("close", disconnect);
  output?.on("error", disconnect);
  try {
    for await (const line of lines) {
      if (!connected) break;
      if (line.trim() === "") continue;
      let message: unknown;
      try { message = JSON.parse(line); }
      catch {
        reply(fail(null, -32700, "Parse error"));
        continue;
      }
      const req = typeof message === "object" && message !== null && !Array.isArray(message) ? message as Request : undefined;
      if (req?.method === "notifications/cancelled" && !("id" in req)) {
        const id = req.params?.["requestId"];
        if (typeof id === "string" || typeof id === "number") pending.get(id)?.abort();
        continue;
      }
      if (req?.method === "initialize") {
        const info = req.params?.["clientInfo"];
        if (typeof info === "object" && info !== null && "name" in info && typeof info.name === "string") agent = info.name;
      }
      const controller = new AbortController();
      const id = req?.id ?? null;
      if (req && "id" in req) pending.set(id, controller);
      void handleMcp(message, project, version, { questionHandler: options.questionHandler, terminal: options.terminal, context: { agent, signal: controller.signal } })
        .then((response) => { if (response) reply(response); })
        .catch((error: unknown) => { reply(fail(id, -32603, error instanceof Error ? error.message : String(error))); })
        .finally(() => { if (pending.get(id) === controller) pending.delete(id); });
    }
  } catch (error) {
    if (connected) throw error;
  } finally {
    disconnect();
    input.off("error", disconnect);
    output?.off("close", disconnect);
    // Keep swallowing stream errors while aborted handlers settle; no response is written after disconnection.
  }
}
