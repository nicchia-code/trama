import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as vscode from "vscode";
import { type ChatState, type CursorChatEvent, CursorConversations, type CursorHook, type CursorHookReply } from "../../../src/core/cursor-chat";
import { chatAdvisorEvent, chatAdvisorSubagentStarted, chatAdvisorTaskTaken, chatTurnEnded, chatTurnStarted, setChatStatePublisher } from "./drift-resolution";
import { ASK_DEVELOPER_SENTENCE } from "./prompts";

/** Whether the editor running the extension is Cursor. */
export const isCursor = (): boolean => vscode.env.appName.toLowerCase().includes("cursor");

/** The developer's own Cursor hooks file, where Trama's entries live (never the project's). */
export const cursorHooksFile = (): string => join(homedir(), ".cursor", "hooks.json");

/** The trama program shipped in this extension's package for this platform, or undefined when the package has none. */
export function bundledTrama(extensionPath = vscode.extensions.getExtension("trama-dev.trama")?.extensionPath): string | undefined {
  if (extensionPath === undefined) return undefined;
  const executable = join(extensionPath, "bin", process.platform === "win32" ? "trama.exe" : "trama");
  return existsSync(executable) ? executable : undefined;
}

/** The hook module omp loads with `--hook` in the terminals Trama starts, shipped in this extension's package; undefined when the package has none. */
export function bundledOmpHook(extensionPath = vscode.extensions.getExtension("trama-dev.trama")?.extensionPath): string | undefined {
  if (extensionPath === undefined) return undefined;
  const hook = join(extensionPath, "dist", "omp-hook.js");
  return existsSync(hook) ? hook : undefined;
}

/** The instructions of Unify Drifts, shipped in this extension's package (`media/unify-drifts.md`); undefined when the package has none. */
export function bundledUnifyInstructions(extensionPath = vscode.extensions.getExtension("trama-dev.trama")?.extensionPath): string | undefined {
  if (extensionPath === undefined) return undefined;
  const file = join(extensionPath, "media", "unify-drifts.md");
  return existsSync(file) ? file : undefined;
}

/**
 * Cursor starts its agent's commands without the PATH the extension adds to the editor's terminals, so the instruction
 * gets a second line saying where the shipped trama program is; without one for this platform it stays one line.
 * On Windows the shell of Cursor's agent is unknown, so the line gives the full path of trama.exe with no shell command.
 */
export function withTramaPath(prompt: string, program = bundledTrama()): string {
  if (program === undefined) return prompt;
  if (process.platform === "win32") return `${prompt}\nThe trama command may not be on your PATH. Run it by its full path: ${program}`;
  return `${prompt}\nThe trama command may not be on your PATH. Before anything else run: export PATH="${dirname(program)}:$PATH"`;
}

/** Adds the ask sentence on its own line, after the PATH line when there is one: Cursor's chat gets it on a line of its own. */
export const withAskLine = (prompt: string): string => `${prompt}\n${ASK_DEVELOPER_SENTENCE}`;

const conversations = new CursorConversations();
/** A listener may answer with the text the hook gives back to the agent (`postToolUse`'s context, a follow-up message), also later. */
type ChatEventListener = (event: CursorChatEvent) => string | undefined | void | Promise<string | undefined | void>;
const listeners = new Set<ChatEventListener>();
let chatState: ChatState | undefined;
const stateListeners = new Set<(state: ChatState | undefined) => void>();

/** Listens to the `cursor-chat` Events of Trama's conversations in Cursor's chat, for the project of this window. */
export function onCursorChatEvent(listener: ChatEventListener): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => listeners.delete(listener) };
}

/**
 * Publishes what this window knows for Cursor's hooks (`ChatState`): the window's state file follows it, so the hooks
 * read it without contacting the editor. `undefined` deletes the file.
 */
export function publishChatState(state: ChatState | undefined): void {
  chatState = state;
  for (const listener of stateListeners) listener(state);
}

// The job registry feeds the state file: every change of its conversations, sub-agent calls and watched agents is published.
setChatStatePublisher(publishChatState);

/** Follows the published chat state, starting with the current one. */
export function onChatState(listener: (state: ChatState | undefined) => void): vscode.Disposable {
  stateListeners.add(listener);
  listener(chatState);
  return { dispose: () => stateListeners.delete(listener) };
}

/** A hook forwarded by `trama hook cursor`. Hooks of conversations that are not Trama's produce nothing; the question tool's check only answers whether this window knows the conversation as Trama's. */
export async function receiveCursorHook(hook: CursorHook): Promise<CursorHookReply> {
  if (hook.hook === "preToolUse") return { trama: conversations.isTrama(hook.conversation) };
  // Every prompt starts a turn, also of a conversation that becomes Trama's only with its first registering command.
  if (hook.hook === "beforeSubmitPrompt") chatTurnStarted(hook.root, hook.conversation);
  if (hook.hook === "subagentStart") chatAdvisorSubagentStarted(hook.root, hook.parent ?? hook.conversation, hook.call, hook.subagentType);
  if (hook.takenTask !== undefined) chatAdvisorTaskTaken(hook.root, hook.conversation, hook.takenTask);
  const advisor = (conversation: string): boolean => chatState?.conversations.some((c) => c.conversation === conversation && c.advisor) === true;
  const event = conversations.translate(hook, advisor);
  // A conversation that is not Trama's produces no end Event: its turn ends here.
  if (event === null && (hook.hook === "stop" || hook.hook === "sessionEnd")) chatTurnEnded(hook.root, hook.conversation);
  if (!event) return {};
  // The Advisor of the chat answers first: its transitions (a Task's review, a finished turn) come before the jobs end.
  // Everything up to the first `await` runs at once, so a caller that does not wait still sees the Event applied.
  const advisorText = chatAdvisorEvent(event);
  const pending = [...listeners].map(async (listener) => listener(event));
  // A turn Trama does not continue ends: the end Event follows the one that gave it a last chance.
  if (event.event === "TURN_FINISHING" && advisorText === undefined) {
    const stopped: CursorChatEvent = { ...event, event: "AGENT_STOPPED" };
    chatAdvisorEvent(stopped);
    pending.push(...[...listeners].map(async (listener) => listener(stopped)));
  }
  const answers = [advisorText, ...await Promise.all(pending)];
  const text = answers.find((a): a is string => typeof a === "string" && a !== "");
  return text === undefined ? {} : { text };
}

/**
 * How the instruction reached the chat: sent by itself, waiting for the developer's confirmation and Enter, on the
 * clipboard, or not sent at all because only a chat that sends by itself was allowed.
 */
export type ChatDelivery = "sent" | "confirm" | "clipboard" | "not-sent";

/** The last way out of every chat launcher, and the only step that tells the developer. */
export async function toClipboard(prompt: string): Promise<ChatDelivery> {
  await vscode.env.clipboard.writeText(prompt);
  void vscode.window.showInformationMessage("Trama: the prompt is on the clipboard. Paste it into your agent chat.");
  return "clipboard";
}

/** Cursor refuses a prompt deeplink with an empty text, one over 10,000 characters once encoded, or one naming `.env`. */
export const deeplinkAccepts = (prompt: string): boolean => prompt.trim() !== "" && encodeURIComponent(prompt).length <= 10_000 && !prompt.includes(".env");

/**
 * Sends `prompt` to a new agent conversation in Cursor's chat. Each step that is missing or fails moves silently to the
 * next, and none is tried twice, so no two chats get the same text: 1) `composer.createNew` with `autoSubmit`, which
 * sends it by itself (internal and undocumented); 2) the prompt deeplink, which waits for the developer's confirmation
 * and Enter; 3) the clipboard, with a notice. An instruction left waiting or on the clipboard starts no job. `announce`
 * runs right before the self-sending step and returns how to take its announcement back when that step fails.
 */
export async function openCursorChat(root: string, prompt: string, canSend: () => boolean = () => true, model = "", announce: () => () => void = () => () => undefined): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  let takeBack: (() => void) | undefined;
  try {
    // Its result does not count: Cursor always returns nothing, so only an error moves to the deeplink.
    // The role's model starts this new conversation only, with Max mode off; the later steps carry none.
    const partialState = { text: prompt, richText: prompt, unifiedMode: "agent", ...(model === "" ? {} : { modelConfig: { modelName: model, maxMode: false } }) };
    // Announced right before the self-sending step; taken back if that step fails and the chain moves on.
    takeBack = announce();
    await vscode.commands.executeCommand("composer.createNew", { partialState, openInNewTab: true, autoSubmit: true });
    return "sent";
  } catch {
    // Missing in this version of Cursor, or failed: the deeplink is next.
    takeBack?.();
  }
  if (!canSend()) return "not-sent";
  if (deeplinkAccepts(prompt)) {
    const query = `text=${encodeURIComponent(prompt)}&workspace=${encodeURIComponent(basename(root))}&mode=agent`;
    try {
      if (await vscode.env.openExternal(vscode.Uri.parse(`cursor://anysphere.cursor-deeplink/prompt?${query}`, true))) return "confirm";
    } catch {
      // The clipboard is next.
    }
  }
  if (!canSend()) return "not-sent";
  return toClipboard(prompt);
}
