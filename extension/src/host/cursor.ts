import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as vscode from "vscode";
import { type CursorChatEvent, CursorConversations, type CursorHook } from "../../../src/core/cursor-chat";

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

/**
 * Cursor starts its agent's commands without the PATH the extension adds to the editor's terminals, so the instruction
 * gets a second line saying where the shipped trama program is; without one for this platform it stays one line.
 */
export function withTramaPath(prompt: string, program = bundledTrama()): string {
  if (program === undefined) return prompt;
  return `${prompt}\nThe trama command may not be on your PATH. Before anything else run: export PATH="${dirname(program)}:$PATH"`;
}

const conversations = new CursorConversations();
const listeners = new Set<(event: CursorChatEvent) => void>();

/** Listens to the `cursor-chat` Events of Trama's conversations in Cursor's chat, for the project of this window. */
export function onCursorChatEvent(listener: (event: CursorChatEvent) => void): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => listeners.delete(listener) };
}

/** A hook forwarded by `trama cursor-hook`: hooks of conversations that are not Trama's produce nothing. */
export function receiveCursorHook(hook: CursorHook): void {
  const event = conversations.translate(hook);
  if (event) for (const listener of listeners) listener(event);
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
 * and Enter; 3) the clipboard, with a notice. With `selfSendingOnly` (an automatic scan) only the first step is tried,
 * so no chat is left waiting for the developer.
 */
export async function openCursorChat(root: string, prompt: string, selfSendingOnly = false, canSend: () => boolean = () => true): Promise<ChatDelivery> {
  if (!canSend()) return "not-sent";
  try {
    // Its result does not count: Cursor always returns nothing, so only an error moves to the deeplink.
    await vscode.commands.executeCommand("composer.createNew", { partialState: { text: prompt, richText: prompt, unifiedMode: "agent" }, openInNewTab: true, autoSubmit: true });
    return "sent";
  } catch {
    // Missing in this version of Cursor, or failed: the deeplink is next.
  }
  if (selfSendingOnly || !canSend()) return "not-sent";
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
