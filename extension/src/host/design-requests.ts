import { editorEvent } from "./performance";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import * as vscode from "vscode";
import { consumeRequest, createRequest, isEmptyRequest, requestFile, requestIdAt, requestsDir, requestTitle, sweepRequestImages } from "../../../src/core/design-requests";
import { teamUnavailableReason } from "../../../src/core/manager-mode";
import { approvalBlock, listProposals, pruneImages } from "../../../src/core/proposals";
import type { Project } from "../../../src/core/store";
import { type DesignAnnouncement, type Launch, launchAgent, type LaunchAnnouncement, launched } from "./agent";
import { findProject, NO_PROJECT_WARNING } from "./project";
import { buildPrompt } from "./prompts";

/** Context key for the active tab's written design request. */
const CONTEXT_KEY = "trama.designRequest";
/** The path of a request file, as far as the editor's events can tell without the project: `.trama/requests/<name>.md`. */
const REQUEST_PATH = /[\\/]\.trama[\\/]requests[\\/][^\\/]+\.md$/;
/** Context key for the active group's request tab. */
const RESOURCE_CONTEXT_KEY = "trama.designRequestResources";
/** The workspace state key of the IDs of the requests already sent. */
export const SENT_KEY = "trama.sentDesignRequests";
/** The workspace state key of the IDs of the requests that start a project from scratch (the setup requests). */
export const SETUP_KEY = "trama.setupDesignRequests";
/** The workspace state key of the IDs of the handoff requests (`New handoff` of the Team view). */
export const HANDOFF_KEY = "trama.handoffDesignRequests";
const EMPTY_WARNING = "Trama: write the design request before sending it.";
/** How long after the last change Trama saves a request by itself. */
export const SAVE_DELAY_MS = 300;

/** The ghost texts of an empty request never sent: one for a design request, one for a setup request, one for a handoff request. */
const DESIGN_GHOST = "Describe the change to design: behaviour, edge cases, requirements. Paste or drop images for context. Close this tab or press Send to agent when you are done.";
const SETUP_GHOST = "Describe the application to build: what it does and who it is for. Paste or drop images for context. Close this tab or press Send to agent when you are done.";
const HANDOFF_GHOST = "Describe the work to give your team: what should change, for whom, any deadline or constraint. Close this tab or press Send to agent when you are done.";

/** What a written request asks for: a design, the setup of a project from scratch or a handoff to the team. */
type RequestKind = "design" | "setup" | "handoff";

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
    handoff: vscode.window.createTextEditorDecorationType({ after: { contentText: HANDOFF_GHOST, color: new vscode.ThemeColor("disabledForeground") } }),
  };
  private readonly subscriptions: vscode.Disposable[];
  /**
   * Which request files exist in the project's `requests/` folder: listed once, then followed by the watcher of `.trama/`. The editor's events (typing, saving, a change of
   * tab) ask this instead of the disk. Until the listing is back, every request counts as existing.
   */
  private presence: Presence | undefined;
  /** Set by `dispose`: what waited for the listing of the request files is not settled for a window that is gone. */
  private disposed = false;
  /** What the context keys were last set to, so a key is sent only when its value changes. */
  private context: { shown: boolean; path: string | undefined } | undefined;

  constructor(
    private readonly state: vscode.Memento,
    /** The extension's watcher of `.trama/`, on for the extension's whole life, whether or not the panel is open. */
    tramaFiles: vscode.FileSystemWatcher,
    private readonly project: () => Project | undefined = findProject,
    private readonly launch: (root: string, instruction: string, name: string, announceProposal?: DesignAnnouncement | LaunchAnnouncement, canSend?: () => boolean) => Promise<Launch | undefined> = (root, instruction, name, announceProposal, canSend) => launchAgent(root, instruction, name, announceProposal, canSend),
    /** Run all, started when a setup Proposal is approved on its own; the host always passes it. */
    private readonly runAll?: () => Promise<void>,
  ) {
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(editorEvent("active editor changed", () => this.updateContext())),
      vscode.workspace.onDidChangeTextDocument(editorEvent("document changed", (event: vscode.TextDocumentChangeEvent) => {
        const id = this.requestId(event.document);
        if (id !== undefined) this.refreshGhosts();
        if (event.contentChanges.length > 0 && id !== undefined && !this.finished.has(id)) this.scheduleSave(event.document, id);
      })),
      vscode.window.onDidChangeVisibleTextEditors(editorEvent("visible editors changed", () => this.refreshGhosts())),
      vscode.window.tabGroups.onDidChangeTabs(editorEvent("tabs changed", (event: vscode.TabChangeEvent) => {
        this.finishMissing(event.opened);
        for (const tab of event.closed) void this.closed(tab);
        this.forget();
      })),
      tramaFiles.onDidCreate((uri) => this.created(uri)),
      tramaFiles.onDidDelete((uri) => this.deleted(uri)),
    ];
    const current = this.project();
    if (current) {
      sweepRequestImages(current);
      pruneImages(current);
      // The listing of the request files finishes what needs to know which ones exist: the tabs of files gone, the lists of requests sent and of setups and handoffs.
      this.presenceOf(current);
    }
    this.updateContext();
  }

  /** + Add Work Item: the empty file of a new request, in a tab that is not a preview. */
  async write(): Promise<void> {
    await this.open("design");
  }

  /** Start from Scratch: the empty file of a request that starts the setup, opened as + Add Work Item does; its ID joins the setup list. */
  async writeSetup(): Promise<void> {
    await this.open("setup");
  }

  /** `New handoff` of the Team view: the empty file of a handoff request, opened as + Add Work Item does, only while Team is available; its ID joins the handoff list. */
  async writeHandoff(): Promise<void> {
    const project = this.project();
    const unavailable = project === undefined ? null : teamUnavailableReason(project);
    if (unavailable !== null) {
      void vscode.window.showWarningMessage(`Trama: ${unavailable}`);
      return;
    }
    await this.open("handoff");
  }

  private async open(kind: RequestKind): Promise<void> {
    const project = this.project();
    if (!project) {
      void vscode.window.showWarningMessage(NO_PROJECT_WARNING);
      return;
    }
    const { id, file } = createRequest(project);
    this.appeared(project, id);
    this.finished.delete(id); // A new request may reuse the ID of one deleted earlier in the session.
    if (kind === "setup") await this.state.update(SETUP_KEY, [...this.setupIds(), id]);
    if (kind === "handoff") await this.state.update(HANDOFF_KEY, [...this.handoffIds(), id]);
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
      text = await readFile(uri.fsPath, "utf8");
    } catch {
      return; // Already deleted: `deleted` deals with it.
    }
    if (isEmptyRequest(text)) consumeRequest(project, id);
    else await this.once(id, () => this.deliver(project, id, text));
  }

  dispose(): void {
    this.disposed = true;
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
    const kind = this.kindOf(id);
    const instruction = buildPrompt(kind === "setup" ? { kind: "setup-request", request: id } : kind === "handoff" ? { kind: "handoff-request", request: id } : { kind: "written-design", request: id });
    const title = requestTitle(text) || id;
    // The ghost of a handoff request has no column on the Board: it is a work, shown in the status bar.
    const launch = await this.launch(project.root, instruction, kind === "setup" ? "Setup" : kind === "handoff" ? "Handoff" : "Design", kind === "handoff" ? { kind: "work", title } : title, canSend);
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

  private handoffIds(): string[] {
    return this.state.get<string[]>(HANDOFF_KEY, []);
  }

  /** What request `id` asks for: the lists remember it also after the editor restarts. */
  private kindOf(id: string): RequestKind {
    return this.setupIds().includes(id) ? "setup" : this.handoffIds().includes(id) ? "handoff" : "design";
  }

  /** Takes out of the list at `key` the IDs whose file is gone, and returns them. */
  private async takeGone(key: string, ids: string[], project: Project): Promise<string[]> {
    const gone = ids.filter((id) => requestFile(project, id) !== undefined && !this.exists(project, id));
    if (gone.length > 0) await this.state.update(key, ids.filter((id) => !gone.includes(id)));
    return gone;
  }

  /** Takes out of the setup list the IDs whose file is gone, and returns them. */
  private takeGoneSetup(project: Project): Promise<string[]> {
    return this.takeGone(SETUP_KEY, this.setupIds(), project);
  }

  /** Takes out of the handoff list the IDs whose file is gone: a handoff request consumed by its handoff, or deleted from outside. */
  private takeGoneHandoff(project: Project): Promise<string[]> {
    return this.takeGone(HANDOFF_KEY, this.handoffIds(), project);
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
    if (project) {
      await this.takeGoneSetup(project);
      await this.takeGoneHandoff(project);
    }
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
    const kept = sent.filter((id) => this.exists(project, id));
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
      if (id === undefined || this.exists(project, id)) return false;
      this.finish(id);
      return !tab.isDirty;
    });
    if (gone.length > 0) void vscode.window.tabGroups.close(gone);
  }

  /** Saves `document` shortly after its last change, but never brings back a request file already deleted. */
  private scheduleSave(document: vscode.TextDocument, id: string): void {
    const key = document.uri.toString();
    clearTimeout(this.saves.get(key));
    this.saves.set(
      key,
      setTimeout(() => {
        this.saves.delete(key);
        const project = this.project();
        if (!document.isClosed && document.isDirty && project && this.exists(project, id)) void document.save();
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
    // The watcher says what is gone, listed or not: the requests of the lists and the one named count, so a deletion that comes before the listing is not forgotten.
    const presence = this.presenceOf(project);
    const named = requestIdAt(project, uri.fsPath);
    for (const id of new Set([...presence.ids, ...this.setupIds(), ...this.handoffIds(), ...this.sentIds(), ...(named === undefined ? [] : [named])])) {
      const file = requestFile(project, id);
      if (file === undefined || !within(uri.fsPath, file)) continue;
      presence.ids.delete(id);
      presence.removed.add(id);
    }
    sweepRequestImages(project);
    void this.settleSetup(project);
    void this.takeGoneHandoff(project);
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

  /**
   * The ID of the request `document` shows, or undefined when it is not a request file of the project. The scheme and the path are checked first, so a document
   * that cannot be a request (almost every one) costs nothing; the project is the one the window keeps in memory.
   */
  private requestId(document: vscode.TextDocument | undefined): string | undefined {
    if (!document || document.uri.scheme !== "file" || !REQUEST_PATH.test(document.uri.fsPath)) return undefined;
    const project = this.project();
    return project ? requestIdAt(project, document.uri.fsPath) : undefined;
  }

  /** Shows the ghost text in each visible editor of a request never sent whose document is empty, and clears it elsewhere. */
  private refreshGhosts(): void {
    const start = new vscode.Range(0, 0, 0, 0);
    for (const editor of vscode.window.visibleTextEditors) {
      const id = this.requestId(editor.document);
      const kind = id !== undefined && !this.isDone(id) && editor.document.getText() === "" ? this.kindOf(id) : undefined;
      editor.setDecorations(this.ghosts.design, kind === "design" ? [start] : []);
      editor.setDecorations(this.ghosts.setup, kind === "setup" ? [start] : []);
      editor.setDecorations(this.ghosts.handoff, kind === "handoff" ? [start] : []);
    }
  }

  /** Sets the two context keys of the active tab, each only when its value changes. */
  private updateContext(): void {
    const document = vscode.window.activeTextEditor?.document;
    const id = this.requestId(document);
    const project = id === undefined ? undefined : this.project();
    // A request whose file is gone cannot be sent, whatever the lists say.
    const shown = document !== undefined && id !== undefined && project !== undefined && !this.isDone(id) && this.exists(project, id);
    const path = shown ? document.uri.fsPath : undefined;
    if (this.context?.shown !== shown) void vscode.commands.executeCommand("setContext", CONTEXT_KEY, shown);
    // Menu resource context is evaluated for each editor group, unlike a single global boolean.
    if (this.context === undefined || this.context.path !== path) void vscode.commands.executeCommand("setContext", RESOURCE_CONTEXT_KEY, path === undefined ? {} : { [path]: true });
    this.context = { shown, path };
  }

  /** The request files that exist, as far as the window knows them; the listing of the folder starts the first time it is asked for. */
  private presenceOf(project: Project): Presence {
    if (this.presence?.root !== project.root) {
      const presence: Presence = { root: project.root, ids: new Set(), removed: new Set(), loaded: false };
      this.presence = presence;
      void this.list(project, presence);
    }
    return this.presence;
  }

  /** Whether request `id` has its file. Until the folder is listed it does, unless the watcher already said it was deleted. */
  private exists(project: Project, id: string): boolean {
    const presence = this.presenceOf(project);
    return !presence.removed.has(id) && (!presence.loaded || presence.ids.has(id));
  }

  /** Request `id` has its file now: made by Trama or reported by the watcher. */
  private appeared(project: Project, id: string): void {
    const presence = this.presenceOf(project);
    presence.ids.add(id);
    presence.removed.delete(id);
  }

  /** Lists the request files once; what waited for the list (the tabs of files gone, the lists of sent, setup and handoff requests) is settled when it is back. */
  private async list(project: Project, presence: Presence): Promise<void> {
    try {
      for (const name of await readdir(requestsDir(project))) {
        const id = requestIdAt(project, join(requestsDir(project), name));
        if (id !== undefined && !presence.removed.has(id)) presence.ids.add(id);
      }
    } catch {
      // No requests folder: no request.
    }
    presence.loaded = true;
    if (this.disposed || this.presence !== presence) return;
    this.finishMissing(vscode.window.tabGroups.all.flatMap((group) => group.tabs));
    this.forget();
    this.updateContext();
    await this.clearGoneSetup();
  }

  /** A file or folder appeared in `.trama/`: a request file joins the ones that exist; a folder that may hold requests is listed again. */
  private created(uri: vscode.Uri): void {
    const project = this.project();
    if (!project) return;
    const id = requestIdAt(project, uri.fsPath);
    if (id !== undefined) {
      this.appeared(project, id);
      this.updateContext();
    } else if (within(uri.fsPath, requestsDir(project))) {
      this.presence = undefined;
      this.presenceOf(project);
    }
  }
}

/** True when `path` is `parent` or inside it. */
function within(parent: string, path: string): boolean {
  const rel = relative(parent, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Which request files exist: the ones listed or reported created, minus the ones the watcher reported deleted (`removed` holds that for the ids it said nothing else about). */
interface Presence {
  root: string;
  ids: Set<string>;
  removed: Set<string>;
  loaded: boolean;
}
