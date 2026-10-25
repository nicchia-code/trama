import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import * as vscode from "vscode";
import { safeLink } from "../../../../src/core/links";
import { readOrigin } from "../../../../src/core/manager-mode";
import { useOmpChat } from "../../../../src/core/omp-chat-conversation";
import type { ToChatWebview } from "../../omp-chat-protocol";
import type { ThemeSetting } from "../../webview/theme";
import { settings } from "../agent";
import { webviewHtml } from "../html";
import type { UsageSource } from "./usage";
import type { SendModeStore } from "./send-mode";
import { type ChatSurface, ChatViewModel } from "./view-model";

/** The identities of the view and of the context key (`tech#omp-chat`). */
export const OMP_CHAT_SIDEBAR_VIEW = "trama.ompChatSidebar";
export const OMP_CHAT_VISIBLE_KEY = "trama.ompChatVisible";

/** An attachment is shown whole up to this many bytes; a larger file shows as its name only. */
const MAX_ATTACHMENT_BYTES = 200_000;

export const configuredTheme = (): ThemeSetting => {
  const value = settings().get<string>("theme");
  return value === "light" || value === "dark" ? value : "auto";
};

/** Whether omp Chat is in use now: `trama.ompChat` not turned off in the user settings (`rules#omp-chat`). */
export const ompChatOn = (): boolean => useOmpChat({ ompChat: settings().inspect<unknown>("ompChat")?.globalValue !== false, available: true });

/**
 * The view of omp Chat (in the secondary sidebar): a `WebviewViewProvider` kept alive while hidden (`retainContextWhenHidden`). It is the `ChatViewPort` of the
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
    sendModes: SendModeStore,
    usage?: UsageSource,
  ) {
    this.model = new ChatViewModel(this.surface(), ompChatOn, pending, () => this.root() !== undefined, sendModes, usage);
  }

  /** Registers the provider for the view. */
  register(): vscode.Disposable {
    return vscode.window.registerWebviewViewProvider(OMP_CHAT_SIDEBAR_VIEW, this, { webviewOptions: { retainContextWhenHidden: true } });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [dist] };
    view.webview.html = webviewHtml({
      cspSource: view.webview.cspSource,
      nonce: randomBytes(16).toString("base64"),
      scriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(dist, "omp-chat.js")).toString(),
      mermaidUri: view.webview.asWebviewUri(vscode.Uri.joinPath(dist, "mermaid.js")).toString(),
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
      setVisible: (visible) => void vscode.commands.executeCommand("setContext", OMP_CHAT_VISIBLE_KEY, visible),
      // Shows the view and nothing else: the one command Trama runs to open it.
      reveal: (preserveFocus) => void vscode.commands.executeCommand(`${OMP_CHAT_SIDEBAR_VIEW}.focus`, { preserveFocus }),
      theme: configuredTheme,
      githubRepo: () => {
        const root = this.root();
        return root === undefined ? null : readOrigin(root).repository;
      },
      readText: (path) => {
        try {
          return statSync(path).size <= MAX_ATTACHMENT_BYTES ? readFileSync(path, "utf8") : undefined;
        } catch {
          return undefined;
        }
      },
      openLink: (url) => {
        const link = safeLink(url);
        if (link !== null) void vscode.env.openExternal(vscode.Uri.parse(link, true));
      },
    };
  }
}
