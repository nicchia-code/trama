import type { Raw } from "../../../src/core/schema";
import type { AgentAction, ToHost } from "../protocol";
import type { QuestionAction } from "./question-state";
import { safeLink } from "../../../src/core/links";

export type Parsed = { ok: true; message: ToHost } | { ok: false; reason: string };

const HOWS: readonly string[] = ["fix-code", "accept-proposal", "dismiss"];
/** Task, Proposal, Drift and Feature IDs: no path separators, no spaces, no quotes. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

const bad = (reason: string): Parsed => ({ ok: false, reason });

function parseAction(value: unknown): AgentAction | string {
  if (typeof value !== "object" || value === null) return "launch needs an action";
  const raw = value as Raw;
  switch (raw["kind"]) {
    case "design": {
      if (raw["prompt"] !== undefined && typeof raw["prompt"] !== "string") return "design prompt must be a string";
      return raw["prompt"] === undefined ? { kind: "design" } : { kind: "design", prompt: raw["prompt"] };
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
    case "rework-drift":
      return typeof raw["drift"] === "string" && ID.test(raw["drift"]) ? { kind: "rework-drift", drift: raw["drift"] } : "rework-drift needs a valid Drift ID";
    default:
      return `unknown action "${String(raw["kind"])}"`;
  }
}

const BARE_QUESTION_ACTIONS: readonly string[] = ["next", "skip", "back", "openSummary", "closeQuestions", "cancelSkipAll", "confirmSkipAll", "send", "minimize", "restore"];
const TEXT_LIMIT = 100_000;

function parseQuestionAction(value: unknown): QuestionAction | string {
  if (typeof value !== "object" || value === null) return "questionAction needs an action";
  const raw = value as Raw;
  const type = raw["type"];
  if (typeof type !== "string") return "questionAction needs an action type";
  if (BARE_QUESTION_ACTIONS.includes(type)) return { type } as QuestionAction;
  switch (type) {
    case "toggleOption":
      return Number.isInteger(raw["option"]) ? { type, option: raw["option"] as number } : "toggleOption needs an option index";
    case "openQuestion":
      return Number.isInteger(raw["index"]) ? { type, index: raw["index"] as number } : "openQuestion needs a question index";
    case "setText":
      return typeof raw["text"] === "string" && raw["text"].length <= TEXT_LIMIT ? { type, text: raw["text"] } : "setText needs a text";
    default:
      return `unknown question action "${type}"`;
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
    case "writeDesignRequest":
      return { ok: true, message: { type } };
    case "launch": {
      const action = parseAction(raw["action"]);
      return typeof action === "string" ? bad(action) : { ok: true, message: { type, action } };
    }
    case "openModelFile":
    case "openFile":
      return typeof raw["path"] === "string" && raw["path"] !== "" ? { ok: true, message: { type, path: raw["path"] } } : bad(`${type} needs a path`);
    case "approveProposal":
    case "rejectProposal":
      return id === undefined ? bad(`${type} needs a valid Proposal ID`) : { ok: true, message: { type, id } };
    case "resolveDrift":
      if (id === undefined) return bad("resolveDrift needs a valid Drift ID");
      if (typeof raw["how"] !== "string" || !HOWS.includes(raw["how"])) return bad(`unknown resolution "${String(raw["how"])}"`);
      if (raw["how"] !== "fix-code") return { ok: true, message: { type, id, how: raw["how"] as "accept-proposal" | "dismiss" } };
      if (raw["option"] !== undefined && !(typeof raw["option"] === "number" && Number.isInteger(raw["option"]))) return bad("resolveDrift option must be a whole number");
      if (raw["note"] !== undefined && typeof raw["note"] !== "string") return bad("resolveDrift note must be text");
      return { ok: true, message: { type, id, how: "fix-code", ...(raw["option"] !== undefined ? { option: raw["option"] as number } : {}), ...(raw["note"] !== undefined ? { note: raw["note"] as string } : {}) } };
    case "driftBlocked":
      return id === undefined ? bad("driftBlocked needs a valid Drift ID") : { ok: true, message: { type, id } };
    case "questionAction": {
      if (!Number.isInteger(raw["round"])) return bad("questionAction needs a round");
      const action = parseQuestionAction(raw["action"]);
      return typeof action === "string" ? bad(action) : { ok: true, message: { type, round: raw["round"] as number, action } };
    }
    case "openLink": {
      const url = typeof raw["url"] === "string" ? safeLink(raw["url"]) : null;
      return url === null ? bad("openLink needs an http or https address") : { ok: true, message: { type, url } };
    }
    default:
      return bad(`unknown message type "${type}"`);
  }
}
