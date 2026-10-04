import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { TramaError } from "./errors";
import { modelDir, projectAt, writeFileEnsuringDir } from "./store";

/**
 * Cursor's hooks, as `trama cursor-hook` forwards them to the editor of the project: the hook, the conversation and the
 * project folder. Never the prompt: only whether it starts with one of Trama's skills.
 */
export interface CursorHook {
  hook: "beforeSubmitPrompt" | "stop" | "sessionEnd";
  conversation: string;
  /** The project folder: the first of Cursor's `workspace_roots` that holds a Trama Model. */
  root: string;
  /** beforeSubmitPrompt: the prompt starts with «Use the trama-» or «/trama-». */
  tramaPrompt?: boolean;
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

const HOOKS: readonly CursorHook["hook"][] = ["beforeSubmitPrompt", "stop", "sessionEnd"];
const SKILL_PROMPT = /^(Use the trama-|\/trama-)/;

/** What Cursor needs back from every hook: it must never be blocked. */
export const hookAnswer = (hookName: unknown): object => (hookName === "beforeSubmitPrompt" ? { continue: true } : {});

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** An entry `"<path of a trama program>" cursor-hook` is Trama's, whatever version's program it names. */
const TRAMA_ENTRY = /^".+" cursor-hook$/;

/**
 * Writes Trama's entries into Cursor's user hooks file, one per hook, each running `program`: older Trama entries are
 * replaced, every other entry is kept, a missing file is created. A file that is not valid JSON is left as it is.
 */
export function writeCursorHooks(file: string, program: string): void {
  let config: { [key: string]: unknown; hooks?: unknown } = { version: 1 };
  if (existsSync(file)) {
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch { parsed = undefined; }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new TramaError(`${file} is not valid JSON, so Trama did not add its hooks to it`);
    config = { version: 1, ...parsed };
  }
  const hooks: Record<string, unknown> = typeof config.hooks === "object" && config.hooks !== null && !Array.isArray(config.hooks) ? { ...config.hooks } : {};
  const command = `"${program}" cursor-hook`;
  for (const name of HOOKS) {
    const entries: unknown[] = Array.isArray(hooks[name]) ? hooks[name] : [];
    const others = entries.filter((e) => !(typeof e === "object" && e !== null && "command" in e && typeof e.command === "string" && TRAMA_ENTRY.test(e.command)));
    hooks[name] = [...others, { command }];
  }
  writeFileEnsuringDir(file, `${JSON.stringify({ ...config, hooks }, null, 2)}\n`);
}

/** Reads the JSON Cursor passes to a hook; null when it is not one of Trama's hooks or names no Trama project. */
export function parseCursorHook(input: unknown): CursorHook | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const hook = HOOKS.find((h) => h === raw["hook_event_name"]);
  const conversation = text(raw["conversation_id"]);
  const roots = Array.isArray(raw["workspace_roots"]) ? raw["workspace_roots"].filter((r): r is string => typeof r === "string") : [];
  const root = roots.map((r) => resolve(r)).find((r) => existsSync(join(modelDir(projectAt(r)), "system.md")));
  if (!hook || !conversation || !root) return null;
  const out: CursorHook = { hook, conversation, root };
  if (hook === "beforeSubmitPrompt") out.tramaPrompt = SKILL_PROMPT.test(text(raw["prompt"]) ?? "");
  if (hook === "stop") out.status = text(raw["status"]) ?? "";
  if (hook === "sessionEnd") out.reason = text(raw["reason"]) ?? "";
  return out;
}

/**
 * The editor's memory of which conversations are Trama's, turning their hooks into `cursor-chat` Events. A
 * conversation becomes Trama's with a prompt naming one of Trama's skills and stops being it when it is closed. The
 * memory is lost when the editor restarts: open conversations are followed again from their next Trama prompt.
 */
export class CursorConversations {
  private readonly trama = new Set<string>();

  translate(h: CursorHook): CursorChatEvent | null {
    if (h.hook === "beforeSubmitPrompt" && h.tramaPrompt) this.trama.add(h.conversation);
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
}
