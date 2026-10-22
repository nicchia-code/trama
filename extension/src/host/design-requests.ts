import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";
import * as vscode from "vscode";
import { consumeRequest, createRequest, isEmptyRequest, requestFile, requestIdAt, requestsDir, requestTitle, sweepRequestImages } from "../../../src/core/design-requests";
import { approvalBlock, listProposals, pruneImages } from "../../../src/core/proposals";
import type { Project } from "../../../src/core/store";
import { type DesignAnnouncement, type Launch, launchAgent, launched } from "./agent";
import { findProject, NO_PROJECT_WARNING } from "./project";
import { buildPrompt } from "./prompts";

/** Context key for the active tab's written design request. */
const CONTEXT_KEY = "trama.designRequest";
/** Context key for the active group's request tab. */
const RESOURCE_CONTEXT_KEY = "trama.designRequestResources";
/** The workspace state key of the IDs of the requests already sent. */
export const SENT_KEY = "trama.sentDesignRequests";
/** The workspace state key of the IDs of the requests that start a project from scratch (the setup requests). */
export const SETUP_KEY = "trama.setupDesignRequests";
const EMPTY_WARNING = "Trama: write the design request before sending it.";
/** How long after the last change Trama saves a request by itself. */
export const SAVE_DELAY_MS = 300;

/** The ghost texts of an empty request never sent: one for a design request, one for a setup request. */
const DESIGN_GHOST = "Describe the change to design: behaviour, edge cases, requirements. Paste or drop images for context. Close this tab or press Send to agent when you are done.";
const SETUP_GHOST = "Describe the application to build: what it does and who it is for. Paste or drop images for context. Close this tab or press Send to agent when you are done.";

/**
 * Written design requests in the editor. A request is a file in `.trama/requests/` from the moment + Add Work Item creates
 * it, and Trama saves it by itself while the developer writes, whatever the editor's auto save setting says. Since
 * everything hangs on the file, a tab the editor restores or the developer reopens behaves like the one + Add Work Item opened.
 * Which requests were sent is kept in the workspace state, so it survives restarts; a request file not in that list is
 * being written. Closing the last tab of a request being written sends it, like Send to agent; a request is sent at
 * most once. A request consumed or abandoned is remembered in memory only, while its tab is open.
 * An empty request never sent shows a ghost text in its tab: a decoration, never part of the file.
 */
export class DesignRequests implements vscode.Disposable {
  /** Pending saves, by document URI. */
  private readonly saves = new Map<string, ReturnType<typeof setTimeout>>();
  /** Requests whose instruction is being sent right now, so a second gesture does not send them again. */
  private readonly sending = new Set<string>();
  /** Requests consumed or abandoned in this session, kept while their tab is open; not kept across restarts. */
  private readonly finished = new Set<string>();
  /** The ghost texts of an empty request never sent, shown in its tab; freed with the host. */
  private readonly ghosts = {
    design: vscode.window.createTextEditorDecorationType({ after: { contentText: DESIGN_GHOST, color: new vscode.ThemeColor("disabledForeground") } }),
    setup: vscode.window.createTextEditorDecorationType({ after: { contentText: SETUP_GHOST, color: new vscode.ThemeColor("disabledForeground") } }),
  };
  private readonly subscriptions: vscode.Disposable[];

  constructor(
    private readonly state: vscode.Memento,
    /** The extension's watcher of `.trama/`, on for the extension's whole life, whether or not the panel is open. */
    tramaFiles: vscode.FileSystemWatcher,
    private readonly project: () => Project | undefined = findProject,
    private readonly launch: (root: string, instruction: string, name: string, announceProposal?: DesignAnnouncement, canSend?: () => boolean) => Promise<Launch | undefined> = (root, instruction, name, announceProposal, canSend) => launchAgent(root, instruction, name, announceProposal, canSend),
    /** Run all, started when a setup Proposal is approved on its own; the host always passes it. */
    private readonly runAll?: () => Promise<void>,
  ) {
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() => this.updateContext()),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const id = this.requestId(event.document);
        if (id !== undefined) this.refreshGhosts();
        if (event.contentChanges.length > 0 && id !== undefined && !this.finished.has(id)) this.scheduleSave(event.document);
      }),
      vscode.window.onDidChangeVisibleTextEditors(() => this.refreshGhosts()),
      vscode.window.tabGroups.onDidChangeTabs((event) => {
        this.finishMissing(event.opened);
        for (const tab of event.closed) void this.closed(tab);
        this.forget();
      }),
      tramaFiles.onDidDelete((uri) => this.deleted(uri)),
    ];
    this.finishMissing(vscode.window.tabGroups.all.flatMap((group) => group.tabs));
    this.forget();
    const current = this.project();
    if (current) {
      sweepRequestImages(current);
      pruneImages(current);
    }
    void this.clearGoneSetup();
    this.updateContext();
  }

  /** + Add Work Item: the empty file of a new request, in a tab that is not a preview. */
  async write(): Promise<void> {
    await this.open(false);
  }

  /** Start from Scratch: the empty file of a request that starts the setup, opened as + Add Work Item does; its ID joins the setup list. */
  async writeSetup(): Promise<void> {
    await this.open(true);
  }

  private async open(setup: boolean): Promise<void> {
    const project = this.project();
    if (!project) {
      void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
      return;
    }
    const { id, file } = createRequest(project);
    this.finished.delete(id); // A new request may reuse the ID of one deleted earlier in the session.
    if (setup) await this.state.update(SETUP_KEY, [...this.setupIds(), id]);
    await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: false });
    this.refreshGhosts();
    this.updateContext();
  }

  /**
   * Send to agent, from the editor title of a request never sent; `uri` is the tab's document, or the active one when
   * absent. An empty text sends nothing and keeps the tab. Otherwise the document is saved and the instruction sent;
   * only once it has really left is the request marked as sent and its tab closed, a closing that sends nothing more.
   */
  async send(uri?: vscode.Uri): Promise<void> {
    const document = this.documentAt(uri);
    const project = this.project();
    const id = this.requestId(document);
    if (!document || !project || id === undefined || this.isDone(id) || this.sending.has(id)) return;
    if (isEmptyRequest(document.getText())) {
      void vscode.window.showWarningMessage(EMPTY_WARNING);
      return;
    }
    const sent = await this.once(id, async () => (!document.isDirty || (await document.save())) && this.deliver(project, id, document.getText()));
    if (!sent) return;
    const tabs = this.tabsOf(document.uri);
    if (tabs.length > 0) await vscode.window.tabGroups.close(tabs);
  }

  /**
   * The developer closed a tab. Closing the last tab of a request never sent sends it, with the text on disk: an empty
   * text deletes the file without a word instead, and an instruction that does not leave keeps the request unsent on
   * disk. Closing the editor window never gets here.
   */
  private async closed(tab: vscode.Tab): Promise<void> {
    if (!(tab.input instanceof vscode.TabInputText)) return;
    const uri = tab.input.uri;
    const project = this.project();
    const id = uri.scheme === "file" && project ? requestIdAt(project, uri.fsPath) : undefined;
    if (!project || id === undefined || this.isDone(id) || this.sending.has(id) || this.tabsOf(uri).length > 0) return;
    let text: string;
    try {
      text = readFileSync(uri.fsPath, "utf8");
    } catch {
      return; // Already deleted: `deleted` deals with it.
    }
    if (isEmptyRequest(text)) consumeRequest(project, id);
    else await this.once(id, () => this.deliver(project, id, text));
  }

  dispose(): void {
    for (const timer of this.saves.values()) clearTimeout(timer);
    this.saves.clear();
    for (const subscription of this.subscriptions) subscription.dispose();
    for (const type of Object.values(this.ghosts)) type.dispose();
  }

  /** Runs `work` for request `id` while no other gesture may send it. */
  private async once(id: string, work: () => Promise<boolean>): Promise<boolean> {
    this.sending.add(id);
    try {
      return await work();
    } finally {
      this.sending.delete(id);
      this.updateContext();
    }
  }

  /** Sends the instruction naming request `id`; true, with the request marked as sent, once it has really left. */
  private async deliver(project: Project, id: string, text: string): Promise<boolean> {
    const file = requestFile(project, id);
    const canSend = () => file !== undefined && existsSync(file);
    if (!canSend()) return false;
    const setup = this.setupIds().includes(id);
    const instruction = buildPrompt(setup ? { kind: "setup-request", request: id } : { kind: "written-design", request: id });
    const launch = await this.launch(project.root, instruction, setup ? "Setup" : "Design", requestTitle(text) || id, canSend);
    if (!launched(launch) || !canSend()) return false;
    await this.state.update(SENT_KEY, [...this.sentIds(), id]);
    this.refreshGhosts();
    return true;
  }

  private sentIds(): string[] {
    return this.state.get<string[]>(SENT_KEY, []);
  }

  private setupIds(): string[] {
    return this.state.get<string[]>(SETUP_KEY, []);
  }

  /** Takes out of the setup list the IDs whose file is gone, and returns them. */
  private async takeGoneSetup(project: Project): Promise<string[]> {
    const setup = this.setupIds();
    const gone = setup.filter((id) => {
      const file = requestFile(project, id);
      return file !== undefined && !existsSync(file);
    });
    if (gone.length > 0) await this.state.update(SETUP_KEY, setup.filter((id) => !gone.includes(id)));
    return gone;
  }

  /**
   * A setup request whose file is gone leaves the setup list at once. Its setup Proposal, if it has one: approved, it
   * starts Run all as the Board's button does (a refusal is shown); still open, the developer is told why it was
   * not approved on its own. Nothing else is done.
   */
  private async settleSetup(project: Project): Promise<void> {
    for (const id of await this.takeGoneSetup(project)) {
      const proposal = listProposals(project).find((p) => p.data.kind === "setup" && p.data.request === id);
      if (proposal?.data.status === "approved") {
        try {
          await this.runAll?.();
        } catch (err) {
          void vscode.window.showWarningMessage(`Trama: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else if (proposal?.data.status === "open") {
        const reason = approvalBlock(project, proposal.id)?.reason.replace(/\.$/, "") ?? "it is still open";
        void vscode.window.showWarningMessage(`Trama: the setup Proposal could not be approved on its own: ${reason}. Review it on the Board.`);
      }
    }
  }

  /**
   * At start-up, the setup IDs whose file vanished while no editor had the project open leave the setup list. Nothing
   * is started: those Tasks stay in To do, to be started from the Board.
   */
  private async clearGoneSetup(): Promise<void> {
    const project = this.project();
    if (project) await this.takeGoneSetup(project);
  }

  private isSent(id: string): boolean {
    return this.sentIds().includes(id);
  }

  /** Sent, or consumed or abandoned: either way never sent (again). */
  private isDone(id: string): boolean {
    return this.finished.has(id) || this.isSent(id);
  }

  /** Records request `id` as consumed or abandoned: remembered in memory for this session, while its tab is open. */
  private finish(id: string): void {
    this.finished.add(id);
  }

  /**
   * Forgets what no open tab needs any more: a finished request once its tab is closed, and a sent request as soon as
   * its file is gone, whether or not its tab is open. A tab the editor restores after a restart shows the request file
   * again, which is then a request being written.
   */
  private forget(): void {
    const project = this.project();
    if (!project) return;
    const open = new Set(
      vscode.window.tabGroups.all.flatMap((group) => group.tabs).flatMap((tab) => {
        if (!(tab.input instanceof vscode.TabInputText) || tab.input.uri.scheme !== "file") return [];
        const id = requestIdAt(project, tab.input.uri.fsPath);
        return id === undefined ? [] : [id];
      }),
    );
    for (const id of this.finished) {
      if (!open.has(id)) this.finished.delete(id);
    }
    const sent = this.sentIds();
    const kept = sent.filter((id) => { const file = requestFile(project, id); return file !== undefined && existsSync(file); });
    if (kept.length !== sent.length) void this.state.update(SENT_KEY, kept);
  }

  /**
   * A request tab found open whose file is gone (restored by the editor after a restart, or opened later) is finished:
   * it is marked so and its tab closes at once unless it has unsaved changes, which are left to the editor. Nothing is saved or sent.
   */
  private finishMissing(tabs: readonly vscode.Tab[]): void {
    const project = this.project();
    if (!project) return;
    const gone = tabs.filter((tab) => {
      if (!(tab.input instanceof vscode.TabInputText) || tab.input.uri.scheme !== "file") return false;
      const { fsPath } = tab.input.uri;
      const id = requestIdAt(project, fsPath);
      if (id === undefined || existsSync(fsPath)) return false;
      this.finish(id);
      return !tab.isDirty;
    });
    if (gone.length > 0) void vscode.window.tabGroups.close(gone);
  }

  /** Saves `document` shortly after its last change, but never brings back a request file already deleted. */
  private scheduleSave(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    clearTimeout(this.saves.get(key));
    this.saves.set(
      key,
      setTimeout(() => {
        this.saves.delete(key);
        if (!document.isClosed && document.isDirty && existsSync(document.uri.fsPath)) void document.save();
      }, SAVE_DELAY_MS),
    );
  }

  /**
   * A request file is gone, deleted by the hand-over of its Proposal or from outside: the request is consumed. Its tab
   * closes unless it has unsaved changes, which are left to the editor. Told by the watcher of `.trama/requests/`,
   * whether or not the panel is open. The editor often reports only a deleted folder (`.trama/requests/` or `.trama/`
   * itself), so a deleted folder holding the requests counts as the deletion of every request in it.
   */
  private deleted(uri: vscode.Uri): void {
    const project = this.project();
    if (!project) return;
    const gone = (fsPath: string) => within(uri.fsPath, fsPath) && requestIdAt(project, fsPath) !== undefined;
    if (!gone(uri.fsPath) && !within(uri.fsPath, requestsDir(project))) return;
    sweepRequestImages(project);
    void this.settleSetup(project);
    const allTabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
    const open = [...vscode.workspace.textDocuments.map((document) => document.uri), ...allTabs.flatMap((tab) => (tab.input instanceof vscode.TabInputText ? [tab.input.uri] : []))];
    for (const { scheme, fsPath } of open) {
      const id = scheme === "file" && within(uri.fsPath, fsPath) ? requestIdAt(project, fsPath) : undefined;
      if (id !== undefined) this.finish(id);
    }
    for (const document of vscode.workspace.textDocuments) {
      if (document.uri.scheme !== "file" || !gone(document.uri.fsPath)) continue;
      clearTimeout(this.saves.get(document.uri.toString()));
      this.saves.delete(document.uri.toString());
    }
    this.forget();
    const tabs = allTabs.filter((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === "file" && gone(tab.input.uri.fsPath) && !tab.isDirty);
    if (tabs.length > 0) void vscode.window.tabGroups.close(tabs);
    this.updateContext();
  }

  private tabsOf(uri: vscode.Uri): vscode.Tab[] {
    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri.toString());
  }

  private documentAt(uri: vscode.Uri | undefined): vscode.TextDocument | undefined {
    if (uri === undefined) return vscode.window.activeTextEditor?.document;
    return vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
  }

  /** The ID of the request `document` shows, or undefined when it is not a request file of the project. */
  private requestId(document: vscode.TextDocument | undefined): string | undefined {
    const project = this.project();
    if (!document || !project || document.uri.scheme !== "file") return undefined;
    return requestIdAt(project, document.uri.fsPath);
  }

  /** Shows the ghost text in each visible editor of a request never sent whose document is empty, and clears it elsewhere. */
  private refreshGhosts(): void {
    const start = new vscode.Range(0, 0, 0, 0);
    for (const editor of vscode.window.visibleTextEditors) {
      const id = this.requestId(editor.document);
      const kind = id !== undefined && !this.isDone(id) && editor.document.getText() === "" ? (this.setupIds().includes(id) ? "setup" : "design") : undefined;
      editor.setDecorations(this.ghosts.design, kind === "design" ? [start] : []);
      editor.setDecorations(this.ghosts.setup, kind === "setup" ? [start] : []);
    }
  }

  private updateContext(): void {
    const document = vscode.window.activeTextEditor?.document;
    const id = this.requestId(document);
    // A request whose file is gone cannot be sent, whatever the lists say.
    const shown = document !== undefined && id !== undefined && !this.isDone(id) && existsSync(document.uri.fsPath);
    void vscode.commands.executeCommand("setContext", CONTEXT_KEY, shown);
    // Menu resource context is evaluated for each editor group, unlike a single global boolean.
    void vscode.commands.executeCommand("setContext", RESOURCE_CONTEXT_KEY, shown ? { [document.uri.fsPath]: true } : {});
  }
}

/** True when `path` is `parent` or inside it. */
function within(parent: string, path: string): boolean {
  const rel = relative(parent, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
