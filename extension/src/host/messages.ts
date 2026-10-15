import type { Raw } from "../../../src/core/schema";
import type { AgentAction, ToHost } from "../protocol";
import type { QuestionAction } from "./question-state";
import { type SettingSchema, type SettingValue, settingValueError } from "./settings-schema";
import { safeLink } from "../../../src/core/links";

export type Parsed = { ok: true; message: ToHost } | { ok: false; reason: string };

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
    case "resolve-drifts":
      return { kind: "resolve-drifts" };
    case "implement-design":
      return typeof raw["proposal"] === "string" && ID.test(raw["proposal"]) ? { kind: "implement-design", proposal: raw["proposal"] } : "implement-design needs a valid Proposal ID";
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
    case "pressKey":
      return Number.isInteger(raw["option"]) ? { type, option: raw["option"] as number } : "pressKey needs an option index";
    case "openQuestion":
      return Number.isInteger(raw["index"]) ? { type, index: raw["index"] as number } : "openQuestion needs a question index";
    case "setText":
      return typeof raw["text"] === "string" && raw["text"].length <= TEXT_LIMIT ? { type, text: raw["text"] } : "setText needs a text";
    default:
      return `unknown question action "${type}"`;
  }
}

/** Checks a message from the webview, which is untrusted input, against the `ToHost` contract. `settings` is the manifest's schema: only its keys can be set. */
export function parseToHost(value: unknown, settings: readonly SettingSchema[] = []): Parsed {
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
    case "openCard":
      return (raw["kind"] === "drift" || raw["kind"] === "task") && id !== undefined
        ? { ok: true, message: { type, kind: raw["kind"], id } }
        : bad("openCard needs a Drift or Task identity");
    case "approveProposal":
    case "rejectProposal":
      return id === undefined ? bad(`${type} needs a valid Proposal ID`) : { ok: true, message: { type, id } };
    case "questionAction": {
      if (!Number.isInteger(raw["round"])) return bad("questionAction needs a round");
      const action = parseQuestionAction(raw["action"]);
      return typeof action === "string" ? bad(action) : { ok: true, message: { type, round: raw["round"] as number, action } };
    }
    case "openLink": {
      const url = typeof raw["url"] === "string" ? safeLink(raw["url"]) : null;
      return url === null ? bad("openLink needs an http or https address") : { ok: true, message: { type, url } };
    }
    case "setSetting": {
      const setting = settings.find((s) => s.key === raw["key"]);
      if (setting === undefined) return bad("setSetting needs a key of the Trama settings");
      const reason = settingValueError(setting, raw["value"]);
      return reason === null ? { ok: true, message: { type, key: setting.key, value: raw["value"] as SettingValue } } : bad(`${setting.key}: ${reason}`);
    }
    default:
      return bad(`unknown message type "${type}"`);
  }
}
