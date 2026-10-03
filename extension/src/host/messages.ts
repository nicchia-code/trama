import type { Raw } from "../../../src/core/schema";
import type { AgentAction, Column, ToHost } from "../protocol";

export type Parsed = { ok: true; message: ToHost } | { ok: false; reason: string };

const COLUMNS: readonly string[] = ["todo", "doing", "done"];
const HOWS: readonly string[] = ["fix-code", "accept-proposal", "dismiss"];
/** Task, Proposal, Drift and Feature IDs: no path separators, no spaces, no quotes. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

const bad = (reason: string): Parsed => ({ ok: false, reason });

function parseAction(value: unknown): AgentAction | string {
  if (typeof value !== "object" || value === null) return "launch needs an action";
  const raw = value as Raw;
  switch (raw["kind"]) {
    case "design":
    case "fix": {
      const kind = raw["kind"];
      if (raw["prompt"] !== undefined && typeof raw["prompt"] !== "string") return `${kind} prompt must be a string`;
      return raw["prompt"] === undefined ? { kind } : { kind, prompt: raw["prompt"] };
    }
    case "scan":
      if (raw["feature"] === undefined) return { kind: "scan" };
      return typeof raw["feature"] === "string" && ID.test(raw["feature"]) ? { kind: "scan", feature: raw["feature"] } : "scan needs a valid Feature ID";
    case "implement":
      return typeof raw["task"] === "string" && ID.test(raw["task"]) ? { kind: "implement", task: raw["task"] } : "implement needs a valid Task ID";
    case "implement-all":
      return { kind: "implement-all" };
    case "implement-design":
      return typeof raw["proposal"] === "string" && ID.test(raw["proposal"]) ? { kind: "implement-design", proposal: raw["proposal"] } : "implement-design needs a valid Proposal ID";
    default:
      return `unknown action "${String(raw["kind"])}"`;
  }
}

/** Checks a message from the webview, which is untrusted input, against the `ToHost` contract. */
export function parseToHost(value: unknown): Parsed {
  if (typeof value !== "object" || value === null) return bad("not a message");
  const raw = value as Raw;
  if (typeof raw["type"] !== "string") return bad("not a message");
  const type = raw["type"];
  const id = typeof raw["id"] === "string" && ID.test(raw["id"]) ? raw["id"] : undefined;
  switch (type) {
    case "ready":
      return { ok: true, message: { type } };
    case "launch": {
      const action = parseAction(raw["action"]);
      return typeof action === "string" ? bad(action) : { ok: true, message: { type, action } };
    }
    case "openModelFile":
    case "openFile":
      return typeof raw["path"] === "string" && raw["path"] !== "" ? { ok: true, message: { type, path: raw["path"] } } : bad(`${type} needs a path`);
    case "moveTask":
      if (id === undefined) return bad("moveTask needs a valid Task ID");
      if (typeof raw["column"] !== "string" || !COLUMNS.includes(raw["column"])) return bad(`unknown column "${String(raw["column"])}"`);
      return { ok: true, message: { type, id, column: raw["column"] as Column } };
    case "takeBackTask":
      return id === undefined ? bad("takeBackTask needs a valid Task ID") : { ok: true, message: { type, id } };
    case "approveProposal":
    case "rejectProposal":
      return id === undefined ? bad(`${type} needs a valid Proposal ID`) : { ok: true, message: { type, id } };
    case "resolveDrift":
      if (id === undefined) return bad("resolveDrift needs a valid Drift ID");
      if (typeof raw["how"] !== "string" || !HOWS.includes(raw["how"])) return bad(`unknown resolution "${String(raw["how"])}"`);
      return { ok: true, message: { type, id, how: raw["how"] as "fix-code" | "accept-proposal" | "dismiss" } };
    default:
      return bad(`unknown message type "${type}"`);
  }
}
