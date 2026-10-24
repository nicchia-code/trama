import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { boardDecisionCount } from "../../../../src/core/board-decisions";
import { buildSnapshot } from "../../../../src/core/snapshot";
import type { MenuSituation, MenuViewName, ToMenuWebview } from "../../menu-protocol";
import type { AgentAction, ViewName } from "../../protocol";
import { describeError } from "../controller";
import { driftsFinishing, proposalsFinishing, tasksFinishing } from "../drift-resolution";
import { webviewHtml } from "../html";
import { configuredTheme } from "../omp-chat/view";
import { findProject } from "../project";
import { MenuModel, type MenuSurface } from "./model";

/** The identity of the side menu's view in the manifest (`contributes.views.trama`). */
export const MENU_VIEW = "trama.home";

const DEBOUNCE_MS = 150;

/** What the menu asks of the panel's owner. */
export interface MenuPanel {
  show(view: MenuViewName): Promise<void>;
  launch(action: AgentAction): Promise<void>;
  readonly shownView: ViewName | undefined;
  onDidChangeShownView(listener: (view: ViewName | undefined) => void): { dispose(): void };
}

/** The window's situation for the menu: the folder that counts for the panel (`findProject`) decides between a project and a plain folder. */
export function menuSituation(): MenuSituation {
  if (!vscode.workspace.workspaceFolders?.length) return "noFolder";
  return findProject() === undefined ? "notProject" : "project";
}

/**
 * The side menu (`menu-laterale`): a `WebviewViewProvider` kept alive while hidden (`retainContextWhenHidden`) in the view `trama.home`. It follows the files of
 * `.trama/` through the extension's global watcher, the folders of the window, the settings and the panel's view, also with the panel closed, and keeps the
 * badge of the icon. The extension never opens, closes or moves the sidebar or its views: the editor does that.
 */
export class MenuView implements vscode.WebviewViewProvider, vscode.Disposable {
  readonly model: MenuModel;
  private view: vscode.WebviewView | undefined;
  private badge: vscode.ViewBadge | undefined;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly panel: MenuPanel,
    private readonly tramaFiles: vscode.FileSystemWatcher,
  ) {
    this.model = new MenuModel(this.surface());
  }

  /** Registers the provider and the listeners that keep the menu up to date. */
  register(): vscode.Disposable {
    const onChange = () => this.schedule();
    return vscode.Disposable.from(
      vscode.window.registerWebviewViewProvider(MENU_VIEW, this, { webviewOptions: { retainContextWhenHidden: true } }),
      this.tramaFiles.onDidCreate(onChange),
      this.tramaFiles.onDidChange(onChange),
      this.tramaFiles.onDidDelete(onChange),
      vscode.workspace.onDidChangeWorkspaceFolders(onChange),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("trama.theme")) this.model.themeChanged();
        if (event.affectsConfiguration("trama")) this.refresh();
      }),
      this.panel.onDidChangeShownView(() => this.refresh()),
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [dist] };
    view.webview.html = webviewHtml({
      cspSource: view.webview.cspSource,
      nonce: randomBytes(16).toString("base64"),
      scriptUri: view.webview.asWebviewUri(vscode.Uri.joinPath(dist, "menu.js")).toString(),
    });
    view.badge = this.badge;
    const received = view.webview.onDidReceiveMessage((raw: unknown) => this.model.receive(raw));
    // The menu shows what is true now each time it becomes visible.
    const visibility = view.onDidChangeVisibility(() => {
      if (view.visible) this.refresh();
    });
    view.onDidDispose(() => {
      received.dispose();
      visibility.dispose();
      if (this.view === view) this.view = undefined;
    });
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.view = undefined;
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
  }

  /** Sends the state again; with no view there is nothing to show and no badge to set, and the webview asks for it when it is made. */
  private refresh(): void {
    if (this.view) this.model.refresh();
  }

  /** Shows what failed to the developer: the menu has no place of its own for an error. */
  private guarded(action: () => Promise<void>): void {
    void action().catch((err: unknown) => void vscode.window.showErrorMessage(`Trama: ${describeError(err)}`));
  }

  private surface(): MenuSurface {
    return {
      post: (message: ToMenuWebview) => void this.view?.webview.postMessage(message),
      setBadge: (badge) => {
        this.badge = badge;
        if (this.view) this.view.badge = badge;
      },
      theme: configuredTheme,
      situation: menuSituation,
      facts: () => {
        const project = findProject();
        if (project === undefined) return undefined;
        try {
          const snapshot = buildSnapshot(project, driftsFinishing(project.root), proposalsFinishing(project.root), tasksFinishing(project.root));
          return { decisions: boardDecisionCount(snapshot), tasksSinceScan: snapshot.tasksSinceScan };
        } catch {
          return undefined;
        }
      },
      panelView: () => this.panel.shownView,
      show: (view) => this.guarded(() => this.panel.show(view)),
      scan: () => this.guarded(() => this.panel.launch({ kind: "scan" })),
      openFolder: () => void vscode.commands.executeCommand("workbench.action.files.openFolder"),
    };
  }
}
