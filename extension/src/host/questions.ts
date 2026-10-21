import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import { createQuestionServer, questionProjectId, type CoordinatorMessage, type QuestionServer } from "../../../src/core/question-channel";
import { QuestionRoundQueue } from "../../../src/core/question-rounds";
import { unavailableQuestions } from "../../../src/core/questions";
import { projectAt, type Project } from "../../../src/core/store";
import { trackRound } from "./question-activity";
import type { QuestionSession } from "./question-session";
import { receiveCursorHook } from "./cursor";
import { followsAgent, receiveNotice, receiveAgentIdle } from "./drift-resolution";
import { noteCommandSeen } from "./terminal-activity";
interface WindowRoundService {
  identity: string;
  windowId: string;
  project: Project;
  /** Rounds this service admitted and has not finished; a detached service is disposed once this is zero. */
  inFlight: number;
  server: Promise<QuestionServer>;
  /** The window no longer has this project: it admits no new round, while the rounds already admitted run to their end. */
  detached?: boolean;
}

/** A filing message is held only by the window that follows its agent: other windows ignore it. */
function notFollowedFiling(message: Record<string, unknown>): boolean {
  const type = message["type"];
  if (type !== "drift-filed" && type !== "proposal-delivered" && type !== "task-filed") return false;
  const root = message["root"];
  const holder = message["holder"];
  return typeof root === "string" && typeof holder === "string" && !followsAgent(root, holder);
}

let windowQuestions: EditorQuestions | undefined;

/** Wait for the launching window's endpoint rather than discovering another window. */
export async function questionEndpoint(root: string): Promise<string | undefined> {
  return windowQuestions?.endpoint(root);
}


/** The window-owned queue serves every local `trama question new` connection. */
export class EditorQuestions implements vscode.Disposable {
  private service: WindowRoundService | undefined;
  /** The window's one queue: its rounds are presented one at a time, in order, whichever service admitted them. */
  private queue: QuestionRoundQueue;
  /** Services whose project is gone but whose admitted rounds are still in progress; each is disposed when its last round ends. */
  private readonly retired = new Set<WindowRoundService>();
  private closed = false;
  private readonly subscriptions: vscode.Disposable[];

  constructor(private readonly project: () => Project | undefined, private readonly session: QuestionSession) {
    windowQuestions = this;
    this.queue = new QuestionRoundQueue(session.present);
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
    this.queue.dispose();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.closeService();
    for (const service of this.retired) this.disposeService(service);
    this.retired.clear();
  }

  private refresh(): void {
    if (this.closed) return;
    const project = this.project();
    this.session.setProject(project ? questionProjectId(project) : undefined);
    if (!project) { this.detachService(); return; }
    this.ensure(project);
  }

  private ensure(project: Project): WindowRoundService {
    const identity = questionProjectId(project);
    const current = this.service;
    if (current && current.identity === identity) return current;
    this.detachService();
    const windowId = randomUUID();
    const service: WindowRoundService = {
      identity, windowId, project, inFlight: 0,
      server: createQuestionServer({
        project,
        windowId,
        focusedAt: vscode.window.state.focused ? Date.now() : 0,
        // A window whose project is gone refuses new connections, so the round is answered unavailable before submission.
        serves: () => !this.closed && !service.detached && this.service === service,
        // The channel admits only this project. The round joins the window's queue, behind any round still in progress.
        handler: async (_callerProject, request, context) => {
          if (this.closed || service.detached || this.service !== service) return unavailableQuestions();
          service.inFlight++;
          try {
            return await this.queue.ask(request, context, trackRound(this.session.presentFor(identity)));
          } finally {
            service.inFlight--;
            this.retireIdle(service);
          }
        },
        onCursorHook: receiveCursorHook,
        onActivity: (origin) => {
          noteCommandSeen(origin);
        },
        onAgentIdle: receiveAgentIdle,
        onCoordinatorMessage: (message) => {
          const rooted: CoordinatorMessage = { ...message, root: project.root };
          if (!notFollowedFiling(rooted)) receiveNotice(rooted);
        },
        onClose: () => {
          this.retired.delete(service);
          // Losing the editor that serves this window interrupts every round of the window.
          if (this.service === service) {
            this.service = undefined;
            this.interruptRounds();
          }
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
    if (service) this.disposeService(service);
  }

  /** The project left the window: a service with no round in progress closes now, otherwise it stays until its round ends. */
  private detachService(): void {
    const service = this.service;
    if (!service) return;
    if (service.inFlight === 0) { this.closeService(); return; }
    service.detached = true;
    this.service = undefined;
    this.retired.add(service);
  }

  private retireIdle(service: WindowRoundService): void {
    if (!service.detached || service.inFlight > 0 || !this.retired.delete(service)) return;
    this.disposeService(service);
  }

  /** Editor loss: every round of the window, presented or queued, is interrupted; the window gets a fresh queue for what comes next. */
  private interruptRounds(): void {
    this.queue.dispose();
    this.queue = new QuestionRoundQueue(this.session.present);
  }

  private disposeService(service: WindowRoundService): void {
    void service.server.then((server) => server.dispose()).catch((error: unknown) => this.report(error));
  }

  private report(error: unknown): void {
    if (!this.closed) void vscode.window.showErrorMessage(`Trama question channel: ${error instanceof Error ? error.message : String(error)}`);
  }
}
