import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { git, LEFT_OUT } from "./compared";
import { TramaError } from "./errors";
import { modelDir, projectAt, writeFileEnsuringDir } from "./store";

/**
 * Cursor's hooks, as `trama hook cursor` forwards them to the editor of the project: the hook, the conversation and the
 * project folder. Never the prompt: only whether it starts with one of Trama's skills.
 */
export interface CursorHook {
  hook: "beforeSubmitPrompt" | "stop" | "sessionEnd" | "afterShellExecution" | "preToolUse" | "afterFileEdit" | "postToolUse" | "subagentStart" | "subagentStop";
  /** The conversation (or sub-agent conversation) the hook belongs to. */
  conversation: string;
  /** The project folder: the first of Cursor's `workspace_roots` that holds a Trama Model. */
  root: string;
  /** beforeSubmitPrompt: the prompt names one of Trama's skills that start a job, anywhere in the text. */
  tramaPrompt?: boolean;
  /** afterShellExecution: the command line runs a Trama command that registers the agent's work. The command is never passed on. */
  tramaWork?: boolean;
  /** afterShellExecution: the Task (as the command wrote it) that a `task move <id> doing` of the command line takes; the Advisor of the chat starts watching a sub-agent from it. */
  takenTask?: string;
  /** stop and subagentStop: `completed`, `aborted` or `error`. */
  status?: string;
  /** sessionEnd: why the conversation ended, e.g. `window_close` or `user_close`. */
  reason?: string;
  /** afterFileEdit: the edited file, relative to the project folder. Never the edit itself. */
  file?: string;
  /** afterShellExecution of a watched agent: what `git status` shows after the command, with each file's content hash. Absent otherwise. */
  snapshot?: ChangedFile[];
  /** subagentStart: the conversation that launched the sub-agent. */
  parent?: string;
  /** subagentStart and subagentStop: the sub-agent's kind and the identity of its call. */
  subagentType?: string;
  call?: string;
  /** subagentStop: the files the sub-agent modified, relative to the project folder, and its own conversation. */
  modifiedFiles?: string[];
  child?: string;
}

/** A changed path of the working tree, relative to the project folder, with the hash of its content (absent for a removed file). */
export interface ChangedFile {
  path: string;
  hash?: string;
}

export type CursorChatEventName =
  | "PROMPT_SUBMITTED" | "AGENT_STOPPED" | "AGENT_INTERRUPTED" | "CONVERSATION_CLOSED"
  | "FILES_CHANGED" | "TOOL_FINISHED" | "SUBAGENT_STOPPED" | "SUBAGENT_INTERRUPTED" | "TURN_FINISHING";

/** An Event of the `cursor-chat` Actor, for the project at `root`; the other fields carry what the hook told about it. */
export interface CursorChatEvent {
  event: CursorChatEventName;
  conversation: string;
  root: string;
  /** FILES_CHANGED: the edited file (afterFileEdit), or the photograph of the working tree after a shell command: the host counts only the paths that are new or whose hash differs from its last photograph of that agent. */
  files?: string[];
  /** AGENT_INTERRUPTED from `sessionEnd`: why Cursor ended the session (`aborted` or `error`), as Cursor gave it. A `stop` interruption carries none. */
  sessionReason?: "aborted" | "error";
  snapshot?: ChangedFile[];
  /** SUBAGENT_STOPPED and SUBAGENT_INTERRUPTED: the sub-agent that ended. */
  subagent?: { type?: string; call?: string; child?: string; modifiedFiles: string[] };
}

/** What a window tells back about a hook: whether the conversation is Trama's and, when it has one, the text to give the agent. */
export interface CursorHookReply {
  trama?: boolean;
  text?: string;
}

const HOOKS: readonly CursorHook["hook"][] = ["beforeSubmitPrompt", "stop", "sessionEnd", "afterShellExecution", "preToolUse", "afterFileEdit", "postToolUse", "subagentStart", "subagentStop"];
const SKILL_PROMPT = /trama-(design|scan|implement|import|resolve-drifts|setup)(?![\p{L}\p{N}-])|^Trama: Unify Drifts\r?$/mu;

/** What Cursor needs back from every hook: it must never be blocked. `text` is what a window gave for the hook, when it gave any. */
export function hookAnswer(hookName: unknown, reply?: string): object {
  switch (hookName) {
    case "beforeSubmitPrompt": return { continue: true };
    case "subagentStart": return { permission: "allow" };
    case "postToolUse": return reply ? { additional_context: reply } : {};
    case "stop":
    case "subagentStop": return reply ? { followup_message: reply } : {};
    default: return {};
  }
}

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/**
 * An entry `"<path of a trama program>" hook cursor`, or its Windows form `& "<path>" hook cursor`, is Trama's, whatever
 * version's program it names; so is one with the old `cursor-hook`, which is rewritten.
 */
const TRAMA_ENTRY = /^(& )?".+" (hook cursor|cursor-hook)$/;

/**
 * Writes Trama's entries into Cursor's user hooks file, one per hook, each running `program`: older Trama entries are
 * replaced, every other entry is kept, a missing file is created, and a file whose Trama entries already are these is
 * not written again. A file that is not valid JSON is left as it is. On Windows the command has the PowerShell form
 * `& "<program>" hook cursor` (not tried on Cursor's shell). The shell-command hook runs only for command lines that
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
  const command = `${windows ? "& " : ""}"${program}" hook cursor`;
  for (const name of HOOKS) {
    const entries: unknown[] = Array.isArray(hooks[name]) ? hooks[name] : [];
    const others = entries.filter((e) => !(typeof e === "object" && e !== null && "command" in e && typeof e.command === "string" && TRAMA_ENTRY.test(e.command)));
    // The host, not Cursor, counts the three requests of the chat Advisor: the hooks that can continue an agent have no loop limit.
    const ours: object[] =
      name === "afterShellExecution" ? [{ command, matcher: "trama" }, { command }]
      : name === "preToolUse" ? [{ command, matcher: "AskQuestion" }, { command, matcher: SHELL_TOOL }]
      : name === "stop" || name === "subagentStop" ? [{ command, loop_limit: null }]
      : [{ command }];
    hooks[name] = [...others, ...ours];
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
  if (hook === "afterShellExecution") {
    const command = text(raw["command"]) ?? "";
    out.tramaWork = registersAgentWork(command);
    const taken = takenTask(command);
    if (taken !== undefined) out.takenTask = taken;
  }
  if (hook === "afterFileEdit") {
    const file = projectRelative(root, text(raw["file_path"]));
    if (file !== undefined) out.file = file;
  }
  if (hook === "subagentStart") {
    out.parent = text(raw["parent_conversation_id"]) ?? conversation;
    const type = text(raw["subagent_type"]);
    const call = text(raw["subagent_id"]) ?? text(raw["tool_call_id"]);
    if (type !== undefined) out.subagentType = type;
    if (call !== undefined) out.call = call;
  }
  if (hook === "subagentStop") {
    out.status = text(raw["status"]) ?? "";
    const type = text(raw["subagent_type"]);
    const call = text(raw["subagent_id"]) ?? text(raw["tool_call_id"]);
    const child = text(raw["child_conversation_id"]) ?? text(raw["subagent_conversation_id"]) ?? call;
    if (type !== undefined) out.subagentType = type;
    if (call !== undefined) out.call = call;
    if (child !== undefined) out.child = child;
    out.modifiedFiles = (Array.isArray(raw["modified_files"]) ? raw["modified_files"] : []).map((f) => projectRelative(root, text(f))).filter((f): f is string => f !== undefined);
  }
  return out;
}

/** A shell `preToolUse` call whose line runs `trama`: where it runs, its conversation, the call that launched it when it is a sub-agent's, and the tool's input. Null otherwise, without reading anything. */
export function parseShellHook(input: unknown): { conversation: string; root: string; parentCall?: string; toolInput: Record<string, unknown> } | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (raw["hook_event_name"] !== "preToolUse" || raw["tool_name"] !== SHELL_TOOL) return null;
  const toolInput = raw["tool_input"];
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) return null;
  const command = text((toolInput as Record<string, unknown>)["command"]);
  if (command === undefined || !runsTrama(command)) return null;
  const conversation = text(raw["conversation_id"]);
  const roots = Array.isArray(raw["workspace_roots"]) ? raw["workspace_roots"].filter((r): r is string => typeof r === "string") : [];
  const root = roots.map((r) => resolve(r)).find((r) => existsSync(join(modelDir(projectAt(r)), "system.md")));
  if (!conversation || !root) return null;
  const parentCall = text(raw["parent_tool_call_id"]);
  return { conversation, root, ...(parentCall ? { parentCall } : {}), toolInput: toolInput as Record<string, unknown> };
}

/** `path` (absolute or relative to the project folder) relative to `root`; undefined when it is empty or outside the project. */
function projectRelative(root: string, path: string | undefined): string | undefined {
  if (path === undefined || path === "") return undefined;
  const rel = relative(root, isAbsolute(path) ? path : resolve(root, path));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return undefined;
  return rel.split(sep).join("/");
}

/** An identity: a conversation, call, window or job, as the state file may hold. Anything else is ignored. */
const IDENTITY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const identity = (v: unknown): v is string => typeof v === "string" && IDENTITY.test(v);

/**
 * What one editor window knows for the hooks, written to its state file and read by the hooks without contacting the
 * window: only identities and flags, never a prompt, a command, a path or a note.
 */
export interface ChatState {
  /** The project folder of the window. */
  root: string;
  /** Trama's conversations with their work: the job each belongs to, and whether the Advisor of the chat watches it. */
  conversations: { conversation: string; job?: string; advisor: boolean }[];
  /** The sub-agent calls and the conversation that launched each. */
  subagents: { call: string; conversation: string }[];
  /** Every agent the Advisor watches (a conversation or a sub-agent's) and whether a text waits to be given to it. */
  agents: { agent: string; text: boolean }[];
}

/** The state of one window, as read from its file. */
export interface WindowChatState extends ChatState {
  windowId: string;
}

/** A valid state from its parsed JSON, with every value that is not an identity left out; null when it is not one. */
export function chatStateValue(value: unknown): WindowChatState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!identity(v["windowId"]) || typeof v["root"] !== "string") return null;
  const list = (key: string): Record<string, unknown>[] => (Array.isArray(v[key]) ? v[key].filter((e): e is Record<string, unknown> => !!e && typeof e === "object") : []);
  return {
    windowId: v["windowId"],
    root: v["root"],
    conversations: list("conversations").filter((e) => identity(e["conversation"])).map((e) => ({
      conversation: e["conversation"] as string,
      ...(identity(e["job"]) ? { job: e["job"] } : {}),
      advisor: e["advisor"] === true,
    })),
    subagents: list("subagents").filter((e) => identity(e["call"]) && identity(e["conversation"])).map((e) => ({ call: e["call"] as string, conversation: e["conversation"] as string })),
    agents: list("agents").filter((e) => identity(e["agent"])).map((e) => ({ agent: e["agent"] as string, text: e["text"] === true })),
  };
}

/** Whether a state names `agent` as watched, and whether a text waits for it. */
export const watches = (state: ChatState, agent: string): { watched: boolean; text: boolean } => {
  const found = state.agents.find((a) => a.agent === agent);
  return { watched: found !== undefined, text: found?.text === true };
};

/**
 * The windows a hook concerns, from their state files alone: the ones that watch the agent (`afterFileEdit`, the shell
 * snapshot, `postToolUse` only when a text waits), that know the conversation as Trama's (`subagentStart`), or that
 * watch the sub-agent that stops (`subagentStop`).
 */
export function windowsConcerned(states: WindowChatState[], hook: CursorHook): string[] {
  const concerned = (s: WindowChatState): boolean => {
    switch (hook.hook) {
      case "afterFileEdit":
      case "afterShellExecution":
        return watches(s, hook.conversation).watched;
      case "postToolUse":
        return watches(s, hook.conversation).text;
      case "subagentStart":
        return s.conversations.some((c) => c.conversation === hook.conversation || c.conversation === hook.parent);
      case "subagentStop":
        return watches(s, hook.conversation).watched || (hook.child !== undefined && watches(s, hook.child).watched)
          || (hook.call !== undefined && s.subagents.some((c) => c.call === hook.call));
      default:
        return true;
    }
  };
  return states.filter(concerned).map((s) => s.windowId);
}

/** git's answer, to wait for at most this long (milliseconds). */
const GIT_STATUS_LIMIT_MS = 2000;

/**
 * The photograph of the working tree after an agent's shell command: `git status --porcelain=v1 -z` in `root` and, for
 * each changed or untracked path, the hash of its content (`git hash-object`; none for a removed file), paths relative to
 * `root`, leaving out Trama's folder and the files Trama installs. Null outside a git repository or when git does not
 * answer in time: nothing is then sent.
 */
export function workingTreeSnapshot(root: string): ChangedFile[] | null {
  const start = Date.now();
  const left = () => Math.max(1, GIT_STATUS_LIMIT_MS - (Date.now() - start));
  const top = git(root, ["rev-parse", "--show-toplevel"], left())?.trim();
  const prefix = git(root, ["rev-parse", "--show-prefix"], left())?.trim();
  const status = git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], left());
  if (!top || prefix === undefined || status === null) return null;
  const within = prefix === "" ? "" : prefix.endsWith("/") ? prefix : `${prefix}/`;
  const paths = new Set<string>();
  const tokens = status.split("\0");
  for (let i = 0; i < tokens.length; i++) {
    const entry = tokens[i] as string;
    if (entry.length < 4) continue;
    paths.add(entry.slice(3));
    // A rename or copy is followed by the path it came from.
    if (/[RC]/.test(entry.slice(0, 2))) {
      i++;
      const from = tokens[i];
      if (from !== undefined && from !== "") paths.add(from);
    }
  }
  const inProject = [...paths].filter((p) => p.startsWith(within)).map((p) => p.slice(within.length)).filter((p) => !LEFT_OUT.some((f) => p === f || p.startsWith(`${f}/`))).sort();
  const files: ChangedFile[] = [];
  const present: string[] = [];
  for (const path of inProject) {
    let regular = false;
    try { regular = statSync(join(root, path)).isFile(); } catch { /* removed: no hash */ }
    if (regular) present.push(path); else files.push({ path });
  }
  const hashes = new Map<string, string>();
  for (let i = 0; i < present.length; i += 100) {
    const chunk = present.slice(i, i + 100);
    const out = git(root, ["hash-object", "--", ...chunk], left());
    const lines = out === null ? null : out.split("\n").filter((l) => l !== "");
    if (lines === null || lines.length !== chunk.length) return null;
    for (const [n, p] of chunk.entries()) {
      const hash = lines[n];
      if (hash === undefined) return null;
      hashes.set(p, hash);
    }
  }
  for (const path of present) {
    const hash = hashes.get(path);
    if (hash === undefined) return null;
    files.push({ path, hash });
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** `trama` as the program of a command: the word itself, or a path ending in `/trama` or `\trama.exe`, quoted or not. */
const TRAMA_PROGRAM = /^(?:.*[\\/])?trama(?:\.exe)?$/i;
/** A shell word that sets a variable before the command, as `PATH=…`. */
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Whether a shell command line runs one of Trama's commands that register the agent's work: `announcement new`,
 * `announcement move`, `comparison new`, `proposal new`, `task move <id> doing` or `question new`. Reads such as `task list`, `model list` or `proposal show` do not count,
 * nor does a `trama` word that is not the program of its command.
 */
export function registersAgentWork(command: string): boolean {
  return tramaInvocations(command).some(([first, second, third, fourth]) => {
    if (first === "announcement" && (second === "new" || second === "move")) return true;
    if (first === "comparison" && second === "new") return true;
    if (first === "question" && second === "new") return true;
    if (first === "proposal" && second === "new") return true;
    return first === "task" && second === "move" && third !== undefined && fourth === "doing";
  });
}

/** The Task a shell command line takes with `task move <id> doing`, as written (an ID, a prefix or a short number); undefined when it takes none. */
export function takenTask(command: string): string | undefined {
  for (const [first, second, third, fourth] of tramaInvocations(command))
    if (first === "task" && second === "move" && third !== undefined && fourth === "doing") return third;
  return undefined;
}

/** A segment of a shell command line that runs the `trama` program: where its text starts in the line, and its arguments (after any `--root`), whatever the subcommand. */
interface TramaInvocation { start: number; args: string[] }

/**
 * The `[start, end)` ranges of the commands of a shell line, split at `&&`, `||`, `;`, `|`, `&`, parentheses and line breaks
 * that are outside quotes; the body of a here-document is not a command, so it is left out.
 */
function commandRanges(command: string): [number, number][] {
  const ranges: [number, number][] = [];
  const heredocs: string[] = [];
  let start = 0;
  let quote = "";
  let i = 0;
  while (i < command.length) {
    const ch = command[i]!;
    if (quote !== "") {
      if (ch === "\\" && quote === "\"") i += 2;
      else {
        if (ch === quote) quote = "";
        i++;
      }
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "<" && command[i + 1] === "<" && command[i + 2] !== "<") {
      const heredoc = /^<<-?[ \t]*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(command.slice(i));
      if (heredoc) {
        heredocs.push(heredoc[2]!);
        i += heredoc[0].length;
        continue;
      }
    }
    const length = command.startsWith("&&", i) || command.startsWith("||", i) ? 2 : /[;|&()\r\n]/.test(ch) ? 1 : 0;
    if (length === 0) {
      i++;
      continue;
    }
    ranges.push([start, i]);
    i += length;
    if (ch === "\n") {
      for (const delimiter of heredocs.splice(0)) {
        while (i < command.length) {
          const eol = command.indexOf("\n", i);
          const line = command.slice(i, eol === -1 ? command.length : eol).replace(/\r$/, "").trim();
          i = eol === -1 ? command.length : eol + 1;
          if (line === delimiter) break;
        }
      }
    }
    start = i;
  }
  ranges.push([start, command.length]);
  return ranges;
}

/** Every segment of a shell command line that runs the `trama` program. */
function tramaSegments(command: string): TramaInvocation[] {
  const found: TramaInvocation[] = [];
  for (const [start, end] of commandRanges(command)) {
    const segment = command.slice(start, end);
    const words = shellWords(segment);
    while (words.length > 0 && ENV_ASSIGNMENT.test(words[0]!)) words.shift();
    if (words.length > 0 && TRAMA_PROGRAM.test(words[0]!)) {
      const args = words.slice(1);
      if (args[0] === "--root") args.splice(0, 2);
      else if (args[0]?.startsWith("--root=")) args.shift();
      found.push({ start: start + (segment.length - segment.trimStart().length), args });
    }
  }
  return found;
}

/** The arguments (after any `--root`) of every segment of a shell command line that runs the `trama` program, whatever the subcommand. */
const tramaInvocations = (command: string): string[][] => tramaSegments(command).map((s) => s.args);

/** Whether a shell command line runs the `trama` program, with any subcommand. */
export const runsTrama = (command: string): boolean => tramaInvocations(command).length > 0;

/** The name Cursor gives its shell tool, for the `matcher` of the `preToolUse` entry that completes `trama` commands. */
export const SHELL_TOOL = "Shell";

/**
 * The Trama conversation a shell command belongs to, from the state files: the conversation itself, or, for a sub-agent
 * (`parentCall` is the call that launched it), the main conversation that launched that call, going up through nested
 * sub-agents. Undefined when no state names it. The job is the one the state gives that conversation, if any.
 */
export function conversationIdentity(states: ChatState[], conversation: string, parentCall?: string): { conversation: string; job?: string } | undefined {
  let current = conversation;
  if (parentCall !== undefined) {
    const seen = new Set<string>();
    let call: string | undefined = parentCall;
    while (call !== undefined && !seen.has(call)) {
      seen.add(call);
      const launcher = states.flatMap((s) => s.subagents).find((s) => s.call === call);
      if (!launcher) break;
      current = launcher.conversation;
      call = states.some((s) => s.conversations.some((c) => c.conversation === current)) ? undefined : current;
    }
  }
  for (const state of states) {
    const found = state.conversations.find((c) => c.conversation === current);
    if (found) return { conversation: found.conversation, ...(found.job === undefined ? {} : { job: found.job }) };
  }
  return undefined;
}

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * The answer of the shell `preToolUse` hook for a line that runs `trama`: `updated_input` with the line completed with
 * `TRAMA_CHAT` and, when the conversation has a job, `TRAMA_JOB`. It never grants a permission. `{}` when nothing is added.
 * On POSIX shells the literal prefix goes before every `trama` invocation of the line, so each one has the identity and
 * no variable stays in the shell afterwards; PowerShell has no such prefix, so there the line starts with the assignments.
 */
export function completedCommandAnswer(toolInput: Record<string, unknown>, identityOf: { conversation: string; job?: string } | undefined, windows = process.platform === "win32"): object {
  const command = text(toolInput["command"]);
  if (command === undefined || !identityOf) return {};
  if (windows) {
    const prefix = `$env:TRAMA_CHAT='${identityOf.conversation.replace(/'/g, "''")}'; ${identityOf.job === undefined ? "" : `$env:TRAMA_JOB='${identityOf.job.replace(/'/g, "''")}'; `}`;
    return { updated_input: { ...toolInput, command: `${prefix}${command}` } };
  }
  const invocations = tramaSegments(command);
  if (invocations.length === 0) return {};
  const prefix = `TRAMA_CHAT=${shellQuote(identityOf.conversation)} ${identityOf.job === undefined ? "" : `TRAMA_JOB=${shellQuote(identityOf.job)} `}`;
  let completed = "";
  let from = 0;
  for (const { start } of invocations) {
    completed += command.slice(from, start) + prefix;
    from = start;
  }
  return { updated_input: { ...toolInput, command: completed + command.slice(from) } };
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
  /**
   * `advisor` says whether a conversation has the Advisor of the chat: its normal end of turn is then `TURN_FINISHING`,
   * still a chance to continue it, and the host follows with `AGENT_STOPPED` when it does not.
   */
  translate(h: CursorHook, advisor: (conversation: string) => boolean = () => false): CursorChatEvent | null {
    // The question tool's check (isTrama) produces no Event.
    if (h.hook === "preToolUse") return null;
    if (h.hook === "beforeSubmitPrompt" && h.tramaPrompt) this.trama.add(h.conversation);
    // A command that registers the agent's work makes its conversation Trama's too.
    if (h.hook === "afterShellExecution" && h.tramaWork) this.trama.add(h.conversation);
    const event = (name: CursorChatEventName): CursorChatEvent => ({ event: name, conversation: h.conversation, root: h.root });
    // The hooks of the watched agents (a conversation or a sub-agent) reach a window only when its state file names them.
    switch (h.hook) {
      case "afterFileEdit":
        return h.file === undefined ? null : { ...event("FILES_CHANGED"), files: [h.file] };
      case "afterShellExecution":
        return h.snapshot === undefined ? null : { ...event("FILES_CHANGED"), snapshot: h.snapshot };
      case "postToolUse":
        return event("TOOL_FINISHED");
      case "subagentStart":
        return null;
      case "subagentStop":
        return {
          ...event(h.status === "completed" ? "SUBAGENT_STOPPED" : "SUBAGENT_INTERRUPTED"),
          subagent: { ...(h.subagentType === undefined ? {} : { type: h.subagentType }), ...(h.call === undefined ? {} : { call: h.call }), ...(h.child === undefined ? {} : { child: h.child }), modifiedFiles: h.modifiedFiles ?? [] },
        };
    }
    if (!this.trama.has(h.conversation)) return null;
    switch (h.hook) {
      case "beforeSubmitPrompt":
        return event("PROMPT_SUBMITTED");
      case "stop":
        if (h.status === "completed") return event(advisor(h.conversation) ? "TURN_FINISHING" : "AGENT_STOPPED");
        return h.status === "aborted" || h.status === "error" ? event("AGENT_INTERRUPTED") : null;
      case "sessionEnd":
        // `completed` and other reasons produce nothing: the `stop` already reported the end of the turn.
        // aborted/error is an interruption too, a second chance for a lost `stop`; repeated signals are idempotent.
        if (h.reason === "aborted" || h.reason === "error") return { ...event("AGENT_INTERRUPTED"), sessionReason: h.reason };
        if (h.reason !== "window_close" && h.reason !== "user_close") return null;
        this.trama.delete(h.conversation);
        return event("CONVERSATION_CLOSED");
      default:
        return null;
    }
  }

  /** Whether this editor knows the conversation as Trama's: the answer to the question tool's check. */
  isTrama(conversation: string): boolean {
    return this.trama.has(conversation);
  }
}
