import type { Raw } from "../../../src/core/schema";
import type { AgentAction, ToHost } from "../protocol";
import type { QuestionAction } from "./question-state";
import { type SettingSchema, type SettingValue, settingValueError } from "./settings-schema";
import { safeLink } from "../../../src/core/links";
import { isSafeRelativePath } from "./folder-tree";
import { STEP_KEYS } from "../webview/wizard/logic";
import { ompLoginProvider } from "../omp-login";
import { SOLO_KINDS, type SoloKind } from "../../../src/core/solo-mode";
import { PANEL_VIEWS } from "../menu-protocol";

/** The settings the wizard may write: the keys of its steps. */
const WIZARD_KEYS: readonly string[] = Object.values(STEP_KEYS).flat();
const MAX_EXCLUDED = 10_000;
const MAX_PATH_TEXT = 4096;

export type Parsed = { ok: true; message: ToHost } | { ok: false; reason: string };

/** Task, Proposal, Drift and Feature IDs: no path separators, no spaces, no quotes. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

const bad = (reason: string): Parsed => ({ ok: false, reason });

function parseAction(value: unknown): Exclude<AgentAction, { kind: "scan" | "mergeScan" | "reconcileMerge" }> | string {
  if (typeof value !== "object" || value === null) return "launch needs an action";
  const raw = value as Raw;
  switch (raw["kind"]) {
    case "implement":
      return typeof raw["task"] === "string" && ID.test(raw["task"]) ? { kind: "implement", task: raw["task"] } : "implement needs a valid Task ID";
    case "implement-all":
      return { kind: "implement-all" };
    case "resolve-drifts":
      return typeof raw["drift"] === "string" && ID.test(raw["drift"]) ? { kind: "resolve-drifts", drift: raw["drift"] } : "resolve-drifts needs a valid Drift ID";
    case "unify-drifts":
      return { kind: "unify-drifts" };
    case "import":
      return { kind: "import" };
    default:
      return `unknown action "${String(raw["kind"])}"`;
  }
}

const BARE_QUESTION_ACTIONS: readonly string[] = ["next", "skip", "back", "openSummary", "closeQuestions", "cancelSkipAll", "confirmSkipAll", "send", "minimize", "restore"];
const TEXT_LIMIT = 100_000;
const MAX_QUESTION_ID = 200;

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
    case "askMore":
      return typeof raw["id"] === "string" && raw["id"] !== "" && raw["id"].length <= MAX_QUESTION_ID ? { type, id: raw["id"] } : "askMore needs the question's ID";
    default:
      return `unknown question action "${type}"`;
  }
}

/** `confirmSetup`: the mode, the path (always but in the mode Settings), the folder (only the first setup), the changed keys of the wizard's steps and the excluded paths. */
function parseConfirmSetup(raw: Raw, settings: readonly SettingSchema[]): Parsed {
  const mode = raw["mode"];
  if (mode !== "first" && mode !== "settings" && mode !== "empty-model") return bad("confirmSetup needs a mode: first, settings or empty-model");
  const choice = raw["choice"];
  if (mode !== "settings" && choice !== "import" && choice !== "scratch") return bad("confirmSetup needs a choice: import or scratch");
  if (mode === "first" && (typeof raw["root"] !== "string" || raw["root"] === "")) return bad("confirmSetup needs the folder to initialize");
  if (!Array.isArray(raw["values"])) return bad("confirmSetup needs the values");
  const values: { key: string; value: SettingValue }[] = [];
  for (const entry of raw["values"] as unknown[]) {
    const item = typeof entry === "object" && entry !== null ? (entry as Raw) : {};
    const setting = settings.find((s) => s.key === item["key"]);
    if (setting === undefined || !WIZARD_KEYS.includes(setting.key)) return bad("confirmSetup has a key that is not a setting of the wizard");
    const reason = settingValueError(setting, item["value"]);
    if (reason !== null) return bad(`${setting.key}: ${reason}`);
    values.push({ key: setting.key, value: item["value"] as SettingValue });
  }
  let solo: SoloKind | undefined;
  if (raw["solo"] !== undefined) {
    solo = SOLO_KINDS.find((kind) => kind === raw["solo"]);
    if (solo === undefined || mode === "settings") return bad("confirmSetup has a Solo mode that is not off, folders or files, or the mode has none");
  }
  const excluded = raw["excluded"];
  if (!Array.isArray(excluded) || excluded.length > MAX_EXCLUDED || !excluded.every((path) => typeof path === "string" && isSafeRelativePath(path))) return bad("confirmSetup needs the excluded paths, each inside the folder");
  return {
    ok: true,
    message: {
      type: "confirmSetup",
      mode,
      ...(mode === "settings" ? {} : { choice: choice as "import" | "scratch" }),
      ...(mode === "first" ? { root: raw["root"] as string } : {}),
      values,
      ...(solo === undefined ? {} : { solo }),
      excluded: excluded as string[],
    },
  };
}

/** The wizard step's `systemCertificates` of `agentCheckWanted`, `installOmp` and `ompLogin`: absent, or a boolean; anything else is a reason the message is refused. */
function parseSystemCertificates(raw: Raw, type: string): { systemCertificates?: boolean } | string {
  const value = raw["systemCertificates"];
  if (value === undefined) return {};
  return typeof value === "boolean" ? { systemCertificates: value } : `${type} needs systemCertificates as a boolean, or none`;
}

/**
 * Checks a message from the webview, which is untrusted input, against the `ToHost` contract. `settings` is the manifest's schema: only its keys can be set.
 * `hasTaskImage` tells whether a Task has an image file of that name: `openTaskImage` is accepted only for one that exists.
 */
export function parseToHost(value: unknown, settings: readonly SettingSchema[] = [], hasTaskImage: (task: string, name: string) => boolean = () => false): Parsed {
  if (typeof value !== "object" || value === null) return bad("not a message");
  const raw = value as Raw;
  if (typeof raw["type"] !== "string") return bad("not a message");
  const type = raw["type"];
  const id = typeof raw["id"] === "string" && ID.test(raw["id"]) ? raw["id"] : undefined;
  switch (type) {
    case "ready":
    case "writeDesignRequest":
    case "refineAll":
    case "cancelRefineAll":
      return { ok: true, message: { type } };
    case "modelSuggestionsWanted": {
      if (raw["ompPath"] === undefined) return { ok: true, message: { type } };
      if (typeof raw["ompPath"] !== "string" || raw["ompPath"].length > MAX_PATH_TEXT) return bad("modelSuggestionsWanted needs an omp path as text, or none");
      return { ok: true, message: { type, ompPath: raw["ompPath"] } };
    }
    case "agentCheckWanted": {
      if (typeof raw["ompPath"] !== "string" || raw["ompPath"].length > MAX_PATH_TEXT) return bad("agentCheckWanted needs an omp path");
      const certificates = parseSystemCertificates(raw, type);
      return typeof certificates === "string" ? bad(certificates) : { ok: true, message: { type, ompPath: raw["ompPath"], ...certificates } };
    }
    case "ompLogin": {
      const provider = typeof raw["provider"] === "string" ? ompLoginProvider(raw["provider"]) : undefined;
      if (provider === undefined) return bad("ompLogin needs a provider of the list");
      if (raw["ompPath"] !== undefined && (typeof raw["ompPath"] !== "string" || raw["ompPath"].length > MAX_PATH_TEXT)) return bad("ompLogin needs an omp path as text, or none");
      const certificates = parseSystemCertificates(raw, type);
      if (typeof certificates === "string") return bad(certificates);
      return { ok: true, message: { type, provider: provider.id, ...(raw["ompPath"] === undefined ? {} : { ompPath: raw["ompPath"] as string }), ...certificates } };
    }
    case "ompLogout": {
      const provider = typeof raw["provider"] === "string" ? ompLoginProvider(raw["provider"]) : undefined;
      if (provider === undefined) return bad("ompLogout needs a provider of the list");
      if (raw["ompPath"] === undefined) return { ok: true, message: { type, provider: provider.id } };
      if (typeof raw["ompPath"] !== "string" || raw["ompPath"].length > MAX_PATH_TEXT) return bad("ompLogout needs an omp path as text, or none");
      return { ok: true, message: { type, provider: provider.id, ompPath: raw["ompPath"] } };
    }
    case "setCursorApiKey":
    case "removeCursorApiKey": {
      if (raw["ompPath"] === undefined) return { ok: true, message: { type } };
      if (typeof raw["ompPath"] !== "string" || raw["ompPath"].length > MAX_PATH_TEXT) return bad(`${type} needs an omp path as text, or none`);
      return { ok: true, message: { type, ompPath: raw["ompPath"] } };
    }
    case "installOmp": {
      const certificates = parseSystemCertificates(raw, type);
      return typeof certificates === "string" ? bad(certificates) : { ok: true, message: { type, ...certificates } };
    }
    case "ompStatusWanted":
    case "refreshSystemCertificates":
    case "systemCertificatesExport":
    case "setNtfyToken":
    case "removeNtfyToken":
    case "sendTestNotification":
      return { ok: true, message: { type } };
    case "viewChanged": {
      const view = PANEL_VIEWS.find((name) => name === raw["view"]);
      return view === undefined ? bad("viewChanged needs the name of a view") : { ok: true, message: { type, view } };
    }
    case "instructionFilesWanted":
      if (raw["root"] === undefined) return { ok: true, message: { type } };
      return typeof raw["root"] === "string" && raw["root"] !== "" && raw["root"].length <= MAX_PATH_TEXT
        ? { ok: true, message: { type, root: raw["root"] } }
        : bad("instructionFilesWanted needs a folder, or none");
    case "openInstructionFile":
      return typeof raw["path"] === "string" && raw["path"] !== "" && raw["path"].length <= MAX_PATH_TEXT
        ? { ok: true, message: { type, path: raw["path"] } }
        : bad("openInstructionFile needs a path");
    case "openGuidedSetup":
      return raw["choice"] === "import" || raw["choice"] === "scratch" ? { ok: true, message: { type, choice: raw["choice"] } } : bad("openGuidedSetup needs a choice: import or scratch");
    case "folderChildrenWanted":
      return typeof raw["root"] === "string" && raw["root"] !== "" && typeof raw["path"] === "string" && (raw["path"] === "" || isSafeRelativePath(raw["path"]))
        ? { ok: true, message: { type, root: raw["root"], path: raw["path"] } }
        : bad("folderChildrenWanted needs a folder and a path inside it");
    case "confirmSetup":
      return parseConfirmSetup(raw, settings);
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
    case "cancelRefinement": {
      const proposal = typeof raw["proposal"] === "string" && ID.test(raw["proposal"]) ? raw["proposal"] : undefined;
      return proposal === undefined ? bad("cancelRefinement needs a valid Proposal ID") : { ok: true, message: { type, proposal } };
    }
    case "reworkProposal": {
      const proposal = typeof raw["proposal"] === "string" && ID.test(raw["proposal"]) ? raw["proposal"] : undefined;
      return proposal === undefined ? bad("reworkProposal needs a valid Proposal ID") : { ok: true, message: { type, proposal } };
    }
    case "reworkDrift": {
      const drift = typeof raw["drift"] === "string" && ID.test(raw["drift"]) ? raw["drift"] : undefined;
      return drift === undefined ? bad("reworkDrift needs a valid Drift ID") : { ok: true, message: { type, drift } };
    }
    case "clearDone": {
      const tasks = raw["tasks"];
      return Array.isArray(tasks) && tasks.every((task) => typeof task === "string" && ID.test(task))
        ? { ok: true, message: { type, tasks: tasks as string[] } }
        : bad("clearDone needs the list of Task IDs in Done");
    }
    case "deleteTask": {
      const task = typeof raw["task"] === "string" && ID.test(raw["task"]) ? raw["task"] : undefined;
      return task === undefined ? bad("deleteTask needs a valid Task ID") : { ok: true, message: { type, task } };
    }
    case "dismissDrift":
      return id === undefined ? bad("dismissDrift needs a valid Drift ID") : { ok: true, message: { type, id } };
    case "askMore":
      return (raw["kind"] === "task" || raw["kind"] === "proposal" || raw["kind"] === "drift") && id !== undefined
        ? { ok: true, message: { type, kind: raw["kind"], id } }
        : bad("askMore needs a Task, Proposal or Drift identity");
    case "setProposalModel": {
      const proposal = typeof raw["proposal"] === "string" && ID.test(raw["proposal"]) ? raw["proposal"] : undefined;
      if (proposal === undefined) return bad("setProposalModel needs a valid Proposal ID");
      return typeof raw["model"] === "string" ? { ok: true, message: { type, proposal, model: raw["model"] } } : bad("setProposalModel needs a model text");
    }
    case "questionAction": {
      if (!Number.isInteger(raw["round"])) return bad("questionAction needs a round");
      const action = parseQuestionAction(raw["action"]);
      return typeof action === "string" ? bad(action) : { ok: true, message: { type, round: raw["round"] as number, action } };
    }
    case "openLink": {
      const url = typeof raw["url"] === "string" ? safeLink(raw["url"]) : null;
      return url === null ? bad("openLink needs an http or https address") : { ok: true, message: { type, url } };
    }
    case "openTaskImage": {
      const task = typeof raw["task"] === "string" && ID.test(raw["task"]) ? raw["task"] : undefined;
      const name = raw["name"];
      if (task === undefined || typeof name !== "string" || name === "" || name.length > 255 || !hasTaskImage(task, name)) return bad("openTaskImage needs an image that the Task has");
      return { ok: true, message: { type, task, name } };
    }
    case "setSetting": {
      const setting = settings.find((s) => s.key === raw["key"]);
      if (setting === undefined) return bad("setSetting needs a key of the Trama settings");
      const reason = settingValueError(setting, raw["value"]);
      return reason === null ? { ok: true, message: { type, key: setting.key, value: raw["value"] as SettingValue } } : bad(`${setting.key}: ${reason}`);
    }
    case "setSoloMode": {
      const solo = SOLO_KINDS.find((kind) => kind === raw["solo"]);
      return solo === undefined ? bad("setSoloMode needs a Solo mode: off, folders or files") : { ok: true, message: { type, solo } };
    }
    default:
      return bad(`unknown message type "${type}"`);
  }
}
