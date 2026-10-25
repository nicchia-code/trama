import { randomBytes } from "node:crypto";
import { basename } from "node:path";
import * as vscode from "vscode";
import { boardDecisionCount } from "../../../../src/core/board-decisions";
import { managerStatus } from "../../../../src/core/manager-mode";
import { buildSnapshot } from "../../../../src/core/snapshot";
import type { Project } from "../../../../src/core/store";
import type { MenuSituation, MenuViewName, MergeMenuState, ToMenuWebview } from "../../menu-protocol";
import type { AgentAction, ViewName } from "../../protocol";
import { describeError } from "../controller";
import { driftsFinishing, onDriftResolutionChange, proposalsFinishing, tasksFinishing } from "../drift-resolution";
import { configuredAutoUpdateStaleProposals } from "../agent";
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

/** What the menu asks of Merge of Solo mode (`SoloMerge`). */
export interface MenuMerge {
  /** Merge as the menu shows it; undefined with Solo mode off. */
  state(): MergeMenuState | undefined;
  merge(): Promise<void>;
  openMergeEditor(): Promise<void>;
  reconcile(): Promise<void>;
  abort(): Promise<void>;
  /** Fired when `state()` may have changed. */
  readonly onDidChange: vscode.Event<void>;
}

/** The name the view carries outside a Trama project: the product's, which is also the name of the icon in the activity bar. */
const PRODUCT_NAME = "Trama";

/** The name of a project: the name of its System (the H1 of `system.md`, as the Snapshot reads it) without the spaces around it, else the name of the project's folder when it is empty or the Model cannot be read (`systemName` undefined). */
export function projectName(project: Project, systemName: string | undefined): string {
  return systemName?.trim() || basename(project.root);
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
  /** The name of the project of the last state computed in a project. */
  private name = PRODUCT_NAME;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly panel: MenuPanel,
    private readonly tramaFiles: vscode.FileSystemWatcher,
    private readonly soloMerge: MenuMerge,
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
      // Merge of Solo mode: git, the files of the working copy and the jobs of the agent decide whether it is available.
      this.soloMerge.onDidChange(onChange),
      onDriftResolutionChange(onChange),
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
    // The title is the project's name from the first display, not only from the first state the webview asks for.
    this.model.state();
    this.showTitle(view, menuSituation());
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

  /** The title of the view (`WebviewView.title`, written at run time): the project's name in a project, `Trama` otherwise. */
  private showTitle(view: vscode.WebviewView, situation: MenuSituation): void {
    view.title = situation === "project" ? this.name : PRODUCT_NAME;
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
      post: (message: ToMenuWebview) => {
        if (this.view && message.type === "menuState") this.showTitle(this.view, message.situation);
        void this.view?.webview.postMessage(message);
      },
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
          this.name = projectName(project, snapshot.system.name);
          return { decisions: boardDecisionCount(snapshot, configuredAutoUpdateStaleProposals()), tasksSinceScan: snapshot.tasksSinceScan, handoffs: snapshot.handoffs.length };
        } catch {
          this.name = projectName(project, undefined);
          return undefined;
        }
      },
      panelView: () => this.panel.shownView,
      show: (view) => this.guarded(() => this.panel.show(view)),
      scan: () => this.guarded(() => this.panel.launch({ kind: "scan" })),
      openFolder: () => void vscode.commands.executeCommand("workbench.action.files.openFolder"),
      mergeState: () => this.soloMerge.state(),
      manager: () => {
        const project = findProject();
        if (project === undefined) return false;
        try {
          return managerStatus(project).available;
        } catch {
          return false;
        }
      },
      startMerge: () => this.guarded(() => this.soloMerge.merge()),
      openMergeEditor: () => this.guarded(() => this.soloMerge.openMergeEditor()),
      reconcileMerge: () => this.guarded(() => this.soloMerge.reconcile()),
      abortMerge: () => this.guarded(() => this.soloMerge.abort()),
    };
  }
}
