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
import { receiveCursorHook } from "./cursor";
import { receiveCopilotHook } from "./copilot-chat";
import { awaitAutopilotResume, clearAutopilotFailure, clearSendReservations, localProjectJobs, receiveCoordinatorMessage, receiveAgentIdle, recordSkippedDrift } from "./drift-resolution";
import { noteCommandSeen } from "./terminal-activity";
interface WindowRoundService {
  identity: string;
  windowId: string;
  project: Project;
  queue: QuestionRoundQueue;
  server: Promise<QuestionServer>;
  lease?: CoordinatorLease;
  coordinatorReady: boolean;
  lastRenewedAt: number;
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
      if (!service.coordinatorReady) return this.synchronizeJobs(service);
      return true;
    }
    service.lease = undefined;
    service.coordinatorReady = false;
    // Losing the role frees what this window reserved; the coordinator that holds the role now decides from here on.
    clearSendReservations(root);
    const lease = await acquireCoordinatorLease(service.project, { windowId: service.windowId, endpoint: server.endpoint });
    if (!lease || this.closed || this.service !== service) return false;
    service.lease = lease;
    // The role just taken over waits for a scan end or Resolve Drifts again, in any mode; a request arriving now comes after this.
    awaitAutopilotResume(service.project.root);
    return this.synchronizeJobs(service);
  }

  /** Asks every live window for the jobs it runs, so a coordinator that kept its role learns of work started while the autopilot was disabled. */
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
    const queue = new QuestionRoundQueue(recordDriftAnswers(project, trackRound(this.present)));
    const windowId = randomUUID();
    const service: WindowRoundService = {
      identity, windowId, project, queue, coordinatorReady: false, lastRenewedAt: 0,
      server: createQuestionServer({
        project,
        windowId,
        focusedAt: vscode.window.state.focused ? Date.now() : 0,
        // The channel admits only this project.
        handler: async (_callerProject, request, context) => {
          if (this.closed || this.service !== service) return unavailableQuestions();
          return queue.ask(request, context);
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
                place: "terminal" in job.place ? { terminal: job.place.terminal } : { chat: job.place.chat },
              };
              await sendCoordinatorMessage(project, active).catch(() => ({ delivered: 0 }));
            }
            return { received: true };
          }
          const rooted: CoordinatorMessage = { ...message, root: project.root };
          if (rooted["type"] !== "autopilot-failed") receiveCoordinatorMessage(rooted);
          for (const handler of this.coordinatorHandlers) {
            const response = await handler(rooted);
            if (response !== undefined) return response;
          }
        },
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

  private async synchronizeJobs(service: WindowRoundService): Promise<boolean> {
    if (this.service !== service || !service.lease) return false;
    const result = await sendCoordinatorMessage(service.project, { type: "jobs-query", root: service.project.root });
    service.coordinatorReady = result.delivered > 0 && await renewCoordinatorLease(service.project, service.lease);
    if (service.coordinatorReady) service.lastRenewedAt = Date.now();
    return service.coordinatorReady;
  }

  private closeService(): void {
    const service = this.service;
    this.service = undefined;
    if (!service) return;
    service.queue.dispose();
    void service.server.then(async (server) => {
      if (service.lease) await releaseCoordinatorLease(service.project, service.lease);
      await server.dispose();
    }).catch((error: unknown) => this.report(error));
  }

  private report(error: unknown): void {
    if (!this.closed) void vscode.window.showErrorMessage(`Trama question channel: ${error instanceof Error ? error.message : String(error)}`);
  }
}
