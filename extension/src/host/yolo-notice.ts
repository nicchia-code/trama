import * as vscode from "vscode";
import { OPEN_SETTINGS_BUTTON } from "./omp-launch";

/** Where the memory of the notice is kept for every window and project of the editor (`ExtensionContext.globalState`). */
export interface YoloNoticeStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export const YOLO_NOTICE_KEY = "trama.yoloNoticeShown";
export const YOLO_NOTICE = "Trama: omp Chat now runs commands without asking (yolo). Change it in Settings.";

let store: YoloNoticeStore | undefined;

/** The editor's global state, set once at activation; without it no notice is shown. */
export function setYoloNoticeStore(next: YoloNoticeStore | undefined): void {
  store = next;
}

/**
 * The one-time notice that omp Chat runs in yolo because the developer never chose an approval. The key is written first and the message follows,
 * so it appears at most once per developer; nothing waits for it, and `Open Settings` opens the Settings tab.
 */
export function showYoloNoticeOnce(): void {
  if (store === undefined || store.get<boolean>(YOLO_NOTICE_KEY) === true) return;
  const written = store.update(YOLO_NOTICE_KEY, true);
  void Promise.resolve(written)
    .then(() => vscode.window.showInformationMessage(YOLO_NOTICE, OPEN_SETTINGS_BUTTON))
    .then((choice) => {
      if (choice === OPEN_SETTINGS_BUTTON) void vscode.commands.executeCommand("trama.openSettings");
    })
    .catch(() => undefined);
}
