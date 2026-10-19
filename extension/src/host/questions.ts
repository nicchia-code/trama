import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import {
  acquireCoordinatorLease, createQuestionServer, questionProjectId, releaseCoordinatorLease, renewCoordinatorLease, sendCoordinatorMessage,
  type CoordinatorJson, type CoordinatorLease, type CoordinatorMessage, type QuestionServer,
} from "../../../src/core/question-channel";
import { QuestionRoundQueue } from "../../../src/core/question-rounds";
import { unavailableQuestions } from "../../../src/core/questions";
import { getDrift } from "../../../src/core/work";
import type { QuestionPresenter } from "../../../src/core/question-rounds";
import { projectAt, type Project } from "../../../src/core/store";
import { trackRound } from "./question-activity";
import type { QuestionSession } from "./question-session";
import { receiveCursorHook } from "./cursor";
import { receiveCopilotHook } from "./copilot-chat";
import { awaitAutopilotResume, clearAutopilotFailure, clearSendReservations, followsAgent, localProjectJobs, receiveCoordinatorMessage, receiveAgentIdle, recordSkippedDrift, setJobsVerified } from "./drift-resolution";
import { noteCommandSeen } from "./terminal-activity";
interface WindowRoundService {
  identity: string;
  windowId: string;
  project: Project;
  /** Rounds this service admitted and has not finished; a detached service is disposed once this is zero. */
  inFlight: number;
  server: Promise<QuestionServer>;
  lease?: CoordinatorLease;
  coordinatorReady: boolean;
  lastRenewedAt: number;
  /** The window no longer has this project: it admits no new round, while the rounds already admitted run to their end. */
  detached?: boolean;
}

/**
 * Each question of a round is named by the permanent identity of the Drift it asks about. A skipped one leaves that
 * Drift out of automatic resolution until it changes, a developer scan starts, or it is answered in a later round; an
 * answered one makes it judgeable again. Ids that name no open Drift are ignored.
 */
function recordDriftAnswers(project: Project, present: QuestionPresenter): QuestionPresenter {
  return async (request, context) => {
    const round = await present(request, context);
    for (const [id, answer] of Object.entries(round.answers)) {
      let drift;
      try { drift = getDrift(project, id); } catch { continue; }
      if (drift.data.status !== "open") continue;
      if (answer.status === "skipped") {
        const signature = JSON.stringify({ data: drift.data, body: drift.body });
        recordSkippedDrift(project.root, id, signature);
        void sendCoordinatorMessage(project, { type: "drift-question-skipped", root: project.root, drift: id, signature }).catch(() => undefined);
      } else {
        clearAutopilotFailure(project.root, id);
        void sendCoordinatorMessage(project, { type: "drift-question-answered", root: project.root, drift: id }).catch(() => undefined);
      }
    }
    return round;
  };
}

/** A live window that does not acknowledge the jobs request within this time leaves its jobs unknown, so automatic steps wait. */
const JOBS_QUERY_TIMEOUT_MS = 2000;

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
export function questionWindowId(root: string): Promise<string | undefined> {
  return windowQuestions?.windowId(root) ?? Promise.resolve(undefined);
}

/** The window-owned queue serves every local `trama ask` connection. */
export class EditorQuestions implements vscode.Disposable {
  private service: WindowRoundService | undefined;
  /** The window's one queue: its rounds are presented one at a time, in order, whichever service admitted them. */
  private queue: QuestionRoundQueue;
  /** Services whose project is gone but whose admitted rounds are still in progress; each is disposed when its last round ends. */
  private readonly retired = new Set<WindowRoundService>();
  private closed = false;
  private readonly subscriptions: vscode.Disposable[];
  private readonly coordinatorHandlers = new Set<(message: Record<string, unknown>) => CoordinatorJson | void | Promise<CoordinatorJson | void>>();

  onCoordinatorRequest(handler: (message: Record<string, unknown>) => CoordinatorJson | void | Promise<CoordinatorJson | void>): vscode.Disposable {
    this.coordinatorHandlers.add(handler);
    return new vscode.Disposable(() => this.coordinatorHandlers.delete(handler));
  }

  async isCoordinator(root: string): Promise<boolean> {
    this.refresh();
    const service = this.service;
    if (!service || service.identity !== questionProjectId(projectAt(root))) return false;
    const server = await service.server;
    if (this.closed || this.service !== service) return false;
    if (service.lease && service.coordinatorReady && Date.now() - service.lastRenewedAt < 500) return true;
    if (service.lease && await renewCoordinatorLease(service.project, service.lease)) {
      service.lastRenewedAt = Date.now();
      // The role stays with this window while the jobs of the other windows are unverified; the verification withholds automatic steps only.
      if (!service.coordinatorReady) await this.synchronizeJobs(service);
      return true;
    }
    service.lease = undefined;
    service.coordinatorReady = false;
    // Losing the role frees what this window reserved; the coordinator that holds the role now decides from here on.
    clearSendReservations(root);
    // Losing the role leaves no unverified jobs picture behind; the role taken over verifies its own.
    setJobsVerified(root, true);
    const lease = await acquireCoordinatorLease(service.project, { windowId: service.windowId, endpoint: server.endpoint });
    if (!lease || this.closed || this.service !== service) return false;
    service.lease = lease;
    // The role just taken over waits for a scan end or Resolve Drifts again, in any mode; a request arriving now comes after this.
    awaitAutopilotResume(service.project.root);
    await this.synchronizeJobs(service);
    return true;
  }

  /** Asks every live window for the jobs it runs and tells whether every one answered while this window holds the role. A coordinator that kept its role learns of work started while the autopilot was disabled; a new automatic step needs this to be true. */
  async importJobs(root: string): Promise<boolean> {
    if (!await this.isCoordinator(root)) return false;
    const service = this.service;
    return service !== undefined && this.synchronizeJobs(service);
  }

  async windowId(root: string): Promise<string | undefined> {
    this.refresh();
    const service = this.service;
    if (!service || service.identity !== questionProjectId(projectAt(root))) return undefined;
    return service.windowId;
  }
  currentWindowId(root: string): string | undefined {
    this.refresh();
    const service = this.service;
    return service?.identity === questionProjectId(projectAt(root)) ? service.windowId : undefined;
  }


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
      identity, windowId, project, inFlight: 0, coordinatorReady: false, lastRenewedAt: 0,
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
            return await this.queue.ask(request, context, recordDriftAnswers(project, trackRound(this.session.presentFor(identity))));
          } finally {
            service.inFlight--;
            this.retireIdle(service);
          }
        },
        onCursorHook: receiveCursorHook,
        onCopilotHook: receiveCopilotHook,
        onActivity: (origin) => {
          noteCommandSeen(origin);
        },
        onAgentIdle: receiveAgentIdle,
        onCoordinatorMessage: async (message) => {
          if (message["type"] === "jobs-query") {
            for (const job of localProjectJobs(project.root)) {
              const active: CoordinatorMessage = {
                type: "job", id: job.id, root: project.root, kind: job.kind, active: true,
                origin: job.origin, windowId: job.windowId,
                place: job.place, ...(job.advisor === true ? { advisor: true } : {}),
              };
              await sendCoordinatorMessage(project, active).catch(() => ({ delivered: 0 }));
            }
            return { received: true };
          }
          const rooted: CoordinatorMessage = { ...message, root: project.root };
          if (rooted["type"] !== "autopilot-failed" && !notFollowedFiling(rooted)) receiveCoordinatorMessage(rooted);
          for (const handler of this.coordinatorHandlers) {
            const response = await handler(rooted);
            if (response !== undefined) return response;
          }
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

  private async synchronizeJobs(service: WindowRoundService): Promise<boolean> {
    if (this.service !== service || !service.lease) return false;
    const root = service.project.root;
    const result = await sendCoordinatorMessage(service.project, { type: "jobs-query", root }, { timeoutMs: JOBS_QUERY_TIMEOUT_MS });
    // Every live window must answer: one that does not leaves its jobs unknown, so the picture is not verified.
    const verified = result.live > 0 && result.delivered === result.live;
    setJobsVerified(root, verified);
    service.coordinatorReady = verified && await renewCoordinatorLease(service.project, service.lease);
    if (service.coordinatorReady) service.lastRenewedAt = Date.now();
    return service.coordinatorReady;
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
    service.coordinatorReady = false;
    const lease = service.lease;
    service.lease = undefined;
    if (lease) void releaseCoordinatorLease(service.project, lease).catch((error: unknown) => this.report(error));
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
    void service.server.then(async (server) => {
      if (service.lease) await releaseCoordinatorLease(service.project, service.lease);
      await server.dispose();
    }).catch((error: unknown) => this.report(error));
  }

  private report(error: unknown): void {
    if (!this.closed) void vscode.window.showErrorMessage(`Trama question channel: ${error instanceof Error ? error.message : String(error)}`);
  }
}
