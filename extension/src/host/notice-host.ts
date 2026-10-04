import { basename } from "node:path";
import * as vscode from "vscode";
import { projectAt } from "../../../src/core/store";
import { boardCounts } from "./board-counts";
import { onCursorChatEvent } from "./cursor";
import { EndNotices } from "./end-notices";
import { NoticeService } from "./notices";

/**
 * The notices of this editor window: they live in memory, and the window closing takes them with it. The `trama.ntfy`
 * topic is read each time it matters and never kept, shown or logged.
 */
export const notices = new NoticeService({
  topic: () => vscode.workspace.getConfiguration("trama").get<string>("ntfy", "").trim(),
  fetch: (url, init) => fetch(url, init),
  after: (ms, run) => {
    const timer = setTimeout(run, ms);
    return { cancel: () => clearTimeout(timer) };
  },
  warn: (message) => void vscode.window.showWarningMessage(message),
});

/** The notices on the end of the agent's command, which waiting for their ten seconds can still be cancelled together. */
export const endNotices = new EndNotices(notices);

/** The notices on the end of a turn of a Trama conversation in Cursor's chat, of this window's project. */
export const chatEndNotices = new EndNotices(notices);

/**
 * Every end of a turn of a Trama conversation in Cursor's chat, normal or interrupted, gives birth to a notice (closing
 * the conversation gives none); every new prompt to a Trama conversation cancels those still waiting. Instructions
 * written into a terminal leave them alone, as these leave the terminal's.
 */
export function watchCursorChatNotices(): vscode.Disposable {
  return onCursorChatEvent((e) => {
    if (e.event === "PROMPT_SUBMITTED") chatEndNotices.cancelAll();
    else if (e.event === "AGENT_STOPPED" || e.event === "AGENT_INTERRUPTED")
      chatEndNotices.born(basename(e.root), { kind: e.event === "AGENT_STOPPED" ? "chat-stopped" : "chat-interrupted" }, () => boardCounts(projectAt(e.root)));
  });
}
