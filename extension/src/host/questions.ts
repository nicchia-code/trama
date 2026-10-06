import * as vscode from "vscode";
import { createQuestionServer, questionProjectId, type QuestionServer } from "../../../src/core/question-channel";
import { QuestionRoundQueue } from "../../../src/core/question-rounds";
import { unavailableQuestions } from "../../../src/core/questions";
import type { QuestionPresenter } from "../../../src/core/question-rounds";
import { projectAt, type Project } from "../../../src/core/store";
import { trackRound } from "./question-activity";
import { receiveCursorHook } from "./cursor";

interface WindowRoundService {
  identity: string;
  queue: QuestionRoundQueue;
  server: Promise<QuestionServer>;
}

let windowQuestions: EditorQuestions | undefined;

/** Wait for the launching window's endpoint rather than discovering another window. */
export async function questionEndpoint(root: string): Promise<string | undefined> {
  return windowQuestions?.endpoint(root);
}

/** The window-owned queue serves every local `trama ask` connection. */
export class EditorQuestions implements vscode.Disposable {
  private service: WindowRoundService | undefined;
  private closed = false;
  private readonly subscriptions: vscode.Disposable[];

  /** `present` shows a round to the developer: the overlay of the Trama panel. */
  constructor(private readonly project: () => Project | undefined, private readonly present: QuestionPresenter) {
    windowQuestions = this;
    // Directory deletion/rename does not emit separate events for its children.
    const watcher = vscode.workspace.createFileSystemWatcher("**/.trama");
    this.subscriptions = [
      watcher,
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh()),
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused && this.service) {
          void this.service.server.then((server) => server.focus()).catch((error: unknown) => this.report(error));
        }
      }),
    ];
    this.refresh();
  }

  async endpoint(root: string): Promise<string | undefined> {
    this.refresh();
    const service = this.service;
    if (!service || service.identity !== questionProjectId(projectAt(root))) return undefined;
    const server = await service.server;
    return this.closed || this.service !== service ? undefined : server.endpoint;
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    if (windowQuestions === this) windowQuestions = undefined;
    for (const subscription of this.subscriptions) subscription.dispose();
    this.closeService();
  }

  private refresh(): void {
    if (this.closed) return;
    const project = this.project();
    if (!project) { this.closeService(); return; }
    this.ensure(project);
  }

  private ensure(project: Project): WindowRoundService {
    const identity = questionProjectId(project);
    const current = this.service;
    if (current && current.identity === identity) return current;
    this.closeService();
    const queue = new QuestionRoundQueue(trackRound(this.present));
    const service: WindowRoundService = {
      identity, queue,
      server: createQuestionServer({
        project,
        focusedAt: vscode.window.state.focused ? Date.now() : 0,
        // The channel admits only this project and the worktrees of its round.
        handler: async (_callerProject, request, context) => {
          if (this.closed || this.service !== service) return unavailableQuestions();
          return queue.ask(request, context);
        },
        onCursorHook: receiveCursorHook,
        onClose: () => {
          queue.dispose();
          if (this.service === service) this.service = undefined;
        },
      }),
    };
    this.service = service;
    void service.server.catch((error: unknown) => this.report(error));
    return service;
  }

  private closeService(): void {
    const service = this.service;
    this.service = undefined;
    if (!service) return;
    service.queue.dispose();
    void service.server.then((server) => server.dispose()).catch((error: unknown) => this.report(error));
  }

  private report(error: unknown): void {
    if (!this.closed) void vscode.window.showErrorMessage(`Trama question channel: ${error instanceof Error ? error.message : String(error)}`);
  }
}
