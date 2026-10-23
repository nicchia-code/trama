import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import * as vscode from "vscode";
import { safeLink } from "../../../../src/core/links";
import { useOmpChat } from "../../../../src/core/omp-chat-conversation";
import { ompChatFocusCommand, ompChatKey } from "../../../../src/core/omp-chat-view";
import type { ToChatWebview } from "../../omp-chat-protocol";
import type { ThemeSetting } from "../../webview/theme";
import { configuredAgent, settings } from "../agent";
import { isCursor } from "../cursor";
import { webviewHtml } from "../html";
import { type ChatSurface, ChatViewModel } from "./view-model";

/** The identities of the two views, one per editor, and of the context key (`tech#omp-chat`): the panel view for Cursor, the secondary sidebar view for the rest. */
export const OMP_CHAT_PANEL_VIEW = "trama.ompChat";
export const OMP_CHAT_SIDEBAR_VIEW = "trama.ompChatSidebar";
export const OMP_CHAT_VISIBLE_KEY = "trama.ompChatVisible";

/** An attachment is shown whole up to this many bytes; a larger file shows as its name only. */
const MAX_ATTACHMENT_BYTES = 200_000;

const configuredTheme = (): ThemeSetting => {
  const value = settings().get<string>("theme");
  return value === "light" || value === "dark" ? value : "auto";
};

/** Whether omp Chat is in use now: `trama.ompChat` on in the user settings and `trama.agent` on omp (`rules#omp-chat`). */
export const ompChatOn = (): boolean => useOmpChat({ ompChat: settings().inspect<unknown>("ompChat")?.globalValue === true, agent: configuredAgent(), available: true });

/**
 * The view of omp Chat (in the secondary sidebar, or in the panel in Cursor): a `WebviewViewProvider` kept alive while hidden (`retainContextWhenHidden`). It is the `ChatViewPort` of the
 * conversations; the context key `trama.ompChatVisible` follows its state. `root` is the project's folder, `pending` the ids of the conversations the window
 * has saved and waits to resume.
 */
export class OmpChatView implements vscode.WebviewViewProvider, vscode.Disposable {
  readonly model: ChatViewModel;
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly root: () => string | undefined,
    pending: () => readonly string[],
  ) {
    this.model = new ChatViewModel(this.surface(), ompChatOn, pending);
  }

  /** Registers the provider for both views; only the one of the editor in use is ever shown (`trama.ompChatVisible`). */
  register(): vscode.Disposable {
    const options = { webviewOptions: { retainContextWhenHidden: true } };
    return vscode.Disposable.from(
      vscode.window.registerWebviewViewProvider(OMP_CHAT_PANEL_VIEW, this, options),
      vscode.window.registerWebviewViewProvider(OMP_CHAT_SIDEBAR_VIEW, this, options),
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [dist] };
    view.webview.html = webviewHtml({
      cspSource: view.webview.cspSource,
      nonce: randomBytes(16).toString("base64"),
      scriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(dist, "omp-chat.js")).toString(),
    });
    const received = view.webview.onDidReceiveMessage((raw: unknown) => this.model.receive(raw));
    view.onDidDispose(() => {
      received.dispose();
      if (this.view === view) {
        this.view = undefined;
        this.model.webviewGone();
      }
    });
  }

  dispose(): void {
    this.view = undefined;
  }

  private surface(): ChatSurface {
    return {
      post: (message: ToChatWebview) => void this.view?.webview.postMessage(message),
      setVisible: (visible) => void vscode.commands.executeCommand("setContext", OMP_CHAT_VISIBLE_KEY, ompChatKey(visible, isCursor())),
      // Shows the view and nothing else: the one command Trama runs to open it.
      reveal: (preserveFocus) => void vscode.commands.executeCommand(ompChatFocusCommand(isCursor()), { preserveFocus }),
      theme: configuredTheme,
      readText: (path) => {
        try {
          return statSync(path).size <= MAX_ATTACHMENT_BYTES ? readFileSync(path, "utf8") : undefined;
        } catch {
          return undefined;
        }
      },
      openFile: (path) => void this.openFile(path),
      openLink: (url) => {
        const link = safeLink(url);
        if (link !== null) void vscode.env.openExternal(vscode.Uri.parse(link, true));
      },
    };
  }

  /** A file the agent edited, from a click in the conversation: only inside the project's folder, relative to it or absolute. */
  private async openFile(path: string): Promise<void> {
    const root = this.root();
    if (root === undefined) return;
    const target = resolve(root, path);
    const inside = relative(root, target);
    if (inside.startsWith("..") || isAbsolute(inside)) return;
    try {
      await vscode.window.showTextDocument(vscode.Uri.file(target), { preview: false });
    } catch {
      void vscode.window.showWarningMessage(`Trama: could not open ${inside}.`);
    }
  }
}
