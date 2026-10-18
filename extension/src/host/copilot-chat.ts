import * as vscode from "vscode";
import type { CopilotHook } from "../../../src/core/copilot-chat";
import { copilotTurnEnded, copilotTurnStarted } from "./drift-resolution";

export type CopilotChatEventName = "PROMPT_SUBMITTED" | "AGENT_STOPPED";

export interface CopilotChatEvent {
  root: string;
  conversation: string;
  event: CopilotChatEventName;
}

const conversations = new Set<string>();
const listeners = new Set<(event: CopilotChatEvent) => void>();
const key = (root: string, conversation: string): string => `${root}\0${conversation}`;

/** Listens to recognized Trama conversations in Copilot chat for this project. */
export function onCopilotChatEvent(listener: (event: CopilotChatEvent) => void): vscode.Disposable {
  listeners.add(listener);
  return { dispose: () => listeners.delete(listener) };
}

/** Receives a Copilot hook; only prompt-prefixed conversations emit events. The question tool's check only answers whether this window knows the conversation as Trama's. */
export function receiveCopilotHook(hook: CopilotHook): boolean {
  const id = key(hook.root, hook.conversation);
  if (hook.hook === "PreToolUse") return conversations.has(id);
  if (hook.hook === "UserPromptSubmit" && hook.tramaPrompt) conversations.add(id);
  if (!conversations.has(id)) return false;
  if (hook.hook === "UserPromptSubmit") copilotTurnStarted(hook.root, hook.conversation);
  else copilotTurnEnded(hook.root, hook.conversation);
  const event: CopilotChatEvent = {
    root: hook.root,
    conversation: hook.conversation,
    event: hook.hook === "UserPromptSubmit" ? "PROMPT_SUBMITTED" : "AGENT_STOPPED",
  };
  for (const listener of listeners) listener(event);
  return false;
}
