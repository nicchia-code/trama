import * as vscode from "vscode";
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
