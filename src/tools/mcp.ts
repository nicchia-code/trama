import { createInterface } from "node:readline";
import type { Project } from "../core/store";
import { callTool, TOOLS } from "./catalog";

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
export function handleMcp(message: unknown, project: () => Project, version: string): Response | null {
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
      const outcome = callTool(project, name, req.params?.["arguments"]);
      return ok(req.id, { content: [{ type: "text", text: outcome.text }], isError: outcome.isError });
    }
    default:
      return fail(req.id, -32601, `Method not found: ${req.method}`);
  }
}

/** Serves until stdin closes. Each line is one JSON-RPC message; each answer is one line on stdout. */
export async function serveMcp(project: () => Project, version: string, input: NodeJS.ReadableStream = process.stdin, write: (line: string) => void = (l) => process.stdout.write(l)): Promise<void> {
  for await (const line of createInterface({ input, crlfDelay: Number.POSITIVE_INFINITY })) {
    if (line.trim() === "") continue;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      write(`${JSON.stringify(fail(null, -32700, "Parse error"))}\n`);
      continue;
    }
    const reply = handleMcp(message, project, version);
    if (reply) write(`${JSON.stringify(reply)}\n`);
  }
}
