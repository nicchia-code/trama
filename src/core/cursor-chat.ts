import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TramaError } from "./errors";
import { modelDir, projectAt, writeFileEnsuringDir } from "./store";

/**
 * Cursor's hooks, as `trama cursor-hook` forwards them to the editor of the project: the hook, the conversation and the
 * project folder. Never the prompt: only whether it starts with one of Trama's skills.
 */
export interface CursorHook {
  hook: "beforeSubmitPrompt" | "stop" | "sessionEnd" | "afterShellExecution" | "preToolUse";
  conversation: string;
  /** The project folder: the first of Cursor's `workspace_roots` that holds a Trama Model. */
  root: string;
  /** beforeSubmitPrompt: the prompt names one of Trama's skills that start a job, anywhere in the text. */
  tramaPrompt?: boolean;
  /** afterShellExecution: the command line runs a Trama command that registers the agent's work. The command is never passed on. */
  tramaWork?: boolean;
  /** stop: `completed`, `aborted` or `error`. */
  status?: string;
  /** sessionEnd: why the conversation ended, e.g. `window_close` or `user_close`. */
  reason?: string;
}

export type CursorChatEventName = "PROMPT_SUBMITTED" | "AGENT_STOPPED" | "AGENT_INTERRUPTED" | "CONVERSATION_CLOSED";

/** An Event of the `cursor-chat` Actor, for the project at `root`. */
export interface CursorChatEvent {
  event: CursorChatEventName;
  conversation: string;
  root: string;
}

const HOOKS: readonly CursorHook["hook"][] = ["beforeSubmitPrompt", "stop", "sessionEnd", "afterShellExecution", "preToolUse"];
const SKILL_PROMPT = /trama-(design|scan|implement|import|resolve-drifts|setup)(?![\p{L}\p{N}-])/u;

/** What Cursor needs back from every hook: it must never be blocked. */
export const hookAnswer = (hookName: unknown): object => (hookName === "beforeSubmitPrompt" ? { continue: true } : {});

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** An entry `"<path of a trama program>" cursor-hook`, or its Windows form `& "<path>" cursor-hook`, is Trama's, whatever version's program it names. */
const TRAMA_ENTRY = /^(& )?".+" cursor-hook$/;

/**
 * Writes Trama's entries into Cursor's user hooks file, one per hook, each running `program`: older Trama entries are
 * replaced, every other entry is kept, a missing file is created, and a file whose Trama entries already are these is
 * not written again. A file that is not valid JSON is left as it is. On Windows the command has the PowerShell form
 * `& "<program>" cursor-hook` (not tried on Cursor's shell). The shell-command hook runs only for command lines that
 * contain `trama`.
 */
export function writeCursorHooks(file: string, program: string, windows = process.platform === "win32"): void {
  let config: { [key: string]: unknown; hooks?: unknown } = { version: 1 };
  let existing: unknown;
  if (existsSync(file)) {
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch { parsed = undefined; }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new TramaError(`${file} is not valid JSON, so Trama did not add its hooks to it`);
    existing = parsed;
    config = { version: 1, ...parsed };
  }
  const hooks: Record<string, unknown> = typeof config.hooks === "object" && config.hooks !== null && !Array.isArray(config.hooks) ? { ...config.hooks } : {};
  const command = `${windows ? "& " : ""}"${program}" cursor-hook`;
  for (const name of HOOKS) {
    const entries: unknown[] = Array.isArray(hooks[name]) ? hooks[name] : [];
    const others = entries.filter((e) => !(typeof e === "object" && e !== null && "command" in e && typeof e.command === "string" && TRAMA_ENTRY.test(e.command)));
    const entry = name === "afterShellExecution" ? { command, matcher: "trama" } : name === "preToolUse" ? { command, matcher: "AskQuestion" } : { command };
    hooks[name] = [...others, entry];
  }
  const next = { ...config, hooks };
  if (existing !== undefined && JSON.stringify(existing) === JSON.stringify(next)) return;
  writeFileEnsuringDir(file, `${JSON.stringify(next, null, 2)}\n`);
}

/** Reads the JSON Cursor passes to a hook; null when it is not one of Trama's hooks or names no Trama project. */
export function parseCursorHook(input: unknown): CursorHook | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const hook = HOOKS.find((h) => h === raw["hook_event_name"]);
  // Only Cursor's question tool is of interest: any other tool is passed on without looking for a project.
  if (hook === "preToolUse" && raw["tool_name"] !== "AskQuestion") return null;
  const conversation = text(raw["conversation_id"]);
  const roots = Array.isArray(raw["workspace_roots"]) ? raw["workspace_roots"].filter((r): r is string => typeof r === "string") : [];
  const root = roots.map((r) => resolve(r)).find((r) => existsSync(join(modelDir(projectAt(r)), "system.md")));
  if (!hook || !conversation || !root) return null;
  const out: CursorHook = { hook, conversation, root };
  if (hook === "beforeSubmitPrompt") out.tramaPrompt = SKILL_PROMPT.test(text(raw["prompt"]) ?? "");
  if (hook === "stop") out.status = text(raw["status"]) ?? "";
  if (hook === "sessionEnd") out.reason = text(raw["reason"]) ?? "";
  if (hook === "afterShellExecution") out.tramaWork = registersAgentWork(text(raw["command"]) ?? "");
  return out;
}

/** `trama` as the program of a command: the word itself, or a path ending in `/trama` or `\trama.exe`, quoted or not. */
const TRAMA_PROGRAM = /^(?:.*[\\/])?trama(?:\.exe)?$/i;
/** A shell word that sets a variable before the command, as `PATH=…`. */
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Whether a shell command line runs one of Trama's commands that register the agent's work: `announce` (of any kind),
 * `ask`, `proposal new` or `task move <id> doing`. Reads such as `task next`, `search` or `proposal show` do not count,
 * nor does a `trama` word that is not the program of its command.
 */
export function registersAgentWork(command: string): boolean {
  for (const segment of command.split(/&&|\|\||[;|&()\r\n]/)) {
    const words = shellWords(segment);
    while (words.length > 0 && ENV_ASSIGNMENT.test(words[0]!)) words.shift();
    if (words.length === 0 || !TRAMA_PROGRAM.test(words[0]!)) continue;
    const args = words.slice(1);
    if (args[0] === "--root") args.splice(0, 2);
    else if (args[0]?.startsWith("--root=")) args.shift();
    const [first, second, third, fourth] = args;
    if (first === "announce" || first === "ask") return true;
    if (first === "proposal" && second === "new") return true;
    if (first === "task" && second === "move" && third !== undefined && fourth === "doing") return true;
  }
  return false;
}

/** The words of one shell command segment, quotes removed; backslashes stay, since Windows paths use them. */
function shellWords(segment: string): string[] {
  const words: string[] = [];
  let word = "";
  let inWord = false;
  let quote = "";
  for (const ch of segment) {
    if (quote !== "") {
      if (ch === quote) quote = "";
      else word += ch;
    } else if (ch === "\"" || ch === "'") {
      quote = ch;
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) words.push(word);
      word = "";
      inWord = false;
    } else {
      word += ch;
      inWord = true;
    }
  }
  if (inWord) words.push(word);
  return words;
}

/**
 * The editor's memory of which conversations are Trama's, turning their hooks into `cursor-chat` Events. A
 * conversation becomes Trama's with a prompt naming one of Trama's skills and stops being it when it is closed. The
 * memory is lost when the editor restarts: open conversations are followed again from their next Trama prompt.
 */
export class CursorConversations {
  private readonly trama = new Set<string>();
  translate(h: CursorHook): CursorChatEvent | null {
    // The question tool's check (isTrama) produces no Event.
    if (h.hook === "preToolUse") return null;
    if (h.hook === "beforeSubmitPrompt" && h.tramaPrompt) this.trama.add(h.conversation);
    // A command that registers the agent's work makes its conversation Trama's too, but produces no Event.
    if (h.hook === "afterShellExecution") {
      if (h.tramaWork) this.trama.add(h.conversation);
      return null;
    }
    if (!this.trama.has(h.conversation)) return null;
    const event = (name: CursorChatEventName): CursorChatEvent => ({ event: name, conversation: h.conversation, root: h.root });
    switch (h.hook) {
      case "beforeSubmitPrompt":
        return event("PROMPT_SUBMITTED");
      case "stop":
        if (h.status === "completed") return event("AGENT_STOPPED");
        return h.status === "aborted" || h.status === "error" ? event("AGENT_INTERRUPTED") : null;
      case "sessionEnd":
        // Other reasons produce nothing: the `stop` already reported the end of the turn.
        if (h.reason !== "window_close" && h.reason !== "user_close") return null;
        this.trama.delete(h.conversation);
        return event("CONVERSATION_CLOSED");
    }
  }

  /** Whether this editor knows the conversation as Trama's: the answer to the question tool's check. */
  isTrama(conversation: string): boolean {
    return this.trama.has(conversation);
  }
}
