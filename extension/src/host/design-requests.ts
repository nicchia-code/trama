import { existsSync, readFileSync, rmSync } from "node:fs";
import * as vscode from "vscode";
import { createRequest, isEmptyRequest, requestFile, requestIdAt, requestTitle } from "../../../src/core/design-requests";
import type { Project } from "../../../src/core/store";
import { launchAgent, launched } from "./agent";
import { findProject } from "./project";
import { buildPrompt } from "./prompts";

/** Set on the active editor when it shows a request never sent, so the editor title shows Send to agent. */
const CONTEXT_KEY = "trama.designRequest";
/** The workspace state key of the IDs of the requests already sent. */
export const SENT_KEY = "trama.sentDesignRequests";
const EMPTY_WARNING = "Trama: write the design request before sending it.";
/** How long after the last change Trama saves a request by itself. */
export const SAVE_DELAY_MS = 300;

/**
 * Written design requests in the editor. A request is a file in `.trama/requests/` from the moment Design… creates
 * it, and Trama saves it by itself while the developer writes, whatever the editor's auto save setting says. Since
 * everything hangs on the file, a tab the editor restores or the developer reopens behaves like the one Design… opened.
 * Which requests were sent is kept in the workspace state, so it survives restarts; a request file not in that list is
 * being written. Closing the last tab of a request being written sends it, like Send to agent; a request is sent at
 * most once.
 */
export class DesignRequests implements vscode.Disposable {
  /** Pending saves, by document URI. */
  private readonly saves = new Map<string, ReturnType<typeof setTimeout>>();
  /** Requests whose instruction is being sent right now, so a second gesture does not send them again. */
  private readonly sending = new Set<string>();
  private readonly subscriptions: vscode.Disposable[];

  constructor(
    private readonly state: vscode.Memento,
    private readonly project: () => Project | undefined = findProject,
    private readonly launch: typeof launchAgent = launchAgent,
  ) {
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() => this.updateContext()),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0 && this.requestId(event.document) !== undefined) this.scheduleSave(event.document);
      }),
      vscode.window.tabGroups.onDidChangeTabs((event) => {
        for (const tab of event.closed) void this.closed(tab);
      }),
      this.watchDeletions(),
    ];
    this.forgetMissing();
    this.updateContext();
  }

  /** Design…: the empty file of a new request, in a tab that is not a preview. */
  async write(): Promise<void> {
    const project = this.project();
    if (!project) return;
    const { file } = createRequest(project);
    await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: false });
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
    if (!document || !project || id === undefined || this.isSent(id) || this.sending.has(id)) return;
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
    if (!project || id === undefined || this.isSent(id) || this.sending.has(id) || this.tabsOf(uri).length > 0) return;
    let text: string;
    try {
      text = readFileSync(uri.fsPath, "utf8");
    } catch {
      return; // Already deleted: the deletion watcher deals with it.
    }
    if (isEmptyRequest(text)) rmSync(uri.fsPath, { force: true });
    else await this.once(id, () => this.deliver(project, id, text));
  }

  dispose(): void {
    for (const timer of this.saves.values()) clearTimeout(timer);
    this.saves.clear();
    for (const subscription of this.subscriptions) subscription.dispose();
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
    const launch = await this.launch(project.root, buildPrompt({ kind: "written-design", request: id }), "Design", requestTitle(text));
    if (!launched(launch)) return false;
    await this.state.update(SENT_KEY, [...this.sentIds(), id]);
    return true;
  }

  private sentIds(): string[] {
    return this.state.get<string[]>(SENT_KEY, []);
  }

  private isSent(id: string): boolean {
    return this.sentIds().includes(id);
  }

  /** Drops from the sent list every request whose file no longer exists. */
  private forgetMissing(): void {
    const project = this.project();
    if (!project) return;
    const sent = this.sentIds();
    const kept = sent.filter((id) => {
      const file = requestFile(project, id);
      return file !== undefined && existsSync(file);
    });
    if (kept.length !== sent.length) void this.state.update(SENT_KEY, kept);
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
   * closes unless it has unsaved changes, which are left to the editor.
   */
  private watchDeletions(): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher("**/.trama/requests/*.md", true, true, false);
    watcher.onDidDelete((uri) => {
      const project = this.project();
      if (!project || requestIdAt(project, uri.fsPath) === undefined) return;
      clearTimeout(this.saves.get(uri.toString()));
      this.saves.delete(uri.toString());
      this.forgetMissing();
      const tabs = this.tabsOf(uri).filter((tab) => !tab.isDirty);
      if (tabs.length > 0) void vscode.window.tabGroups.close(tabs);
    });
    return watcher;
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

  private updateContext(): void {
    const id = this.requestId(vscode.window.activeTextEditor?.document);
    void vscode.commands.executeCommand("setContext", CONTEXT_KEY, id !== undefined && !this.isSent(id));
  }
}
