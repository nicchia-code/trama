import type { CompletedQuestionRound, PresentationContext, QuestionPresenter } from "../../../src/core/question-rounds";
import { questionAborted, type QuestionRequest } from "../../../src/core/questions";
import { applyQuestionAction, type QuestionAction, type QuestionRoundState, startRound } from "./question-state";

/** The agent name of a round Trama asks itself (a prepared Drift question): its one question's ID is the identity of that Drift. */
export const PREPARED_QUESTION_AGENT = "Prepared question";

/** The agent that asked a round, when it can be told: `Prepared question` for a round Trama asks itself, `omp` for one started in a terminal of Trama. */
const roundAgent = (context: PresentationContext): string | null => (context.prepared === true ? PREPARED_QUESTION_AGENT : context.fromTramaTerminal === true ? "omp" : null);

/** The round being answered, as the panel draws it. */
export interface QuestionRoundView {
  /** Changes with every round, so an action meant for a round that has closed is ignored. */
  id: number;
  /** The agent that asked, when known. */
  agent: string | null;
  state: QuestionRoundState;
}

interface ActiveRound extends QuestionRoundView {
  context: PresentationContext;
  /** The project the round was admitted for, by identity; undefined when it belongs to no project. */
  owner: string | undefined;
  resolve(result: Awaited<ReturnType<QuestionPresenter>>): void;
}

type Listener = (round: QuestionRoundView | null) => void;

/**
 * The one round being answered in this window. Its state lives here, in the extension host and in memory only, so a
 * panel that is closed and reopened, or a webview that is recreated, draws it exactly as it was.
 */
export class QuestionSession {
  private active: ActiveRound | undefined;
  private nextId = 1;
  private readonly listeners = new Set<Listener>();
  /** The identity of the window's project. A round admitted for another project stays out of sight until the window is back on it. */
  private project: string | undefined;

  /** `reveal` opens the panel in front, on the Diagram, or brings it to the front keeping its tab (the round entered Asking). */
  constructor(private readonly reveal: () => void | Promise<void>) {}

  /** A round that belongs to no project: shown while the window has none. */
  readonly present: QuestionPresenter = (request, context) => this.admit(request, context, undefined);

  /** A round admitted for the project with this identity: shown only while the window is on that project. */
  presentFor(owner: string): QuestionPresenter {
    return (request, context) => this.admit(request, context, owner);
  }

  private admit(request: QuestionRequest, context: PresentationContext, owner: string | undefined): Promise<CompletedQuestionRound> {
    const { promise, resolve, reject } = Promise.withResolvers<CompletedQuestionRound>();
    if (context.signal.aborted) {
      reject(context.signal.reason ?? questionAborted());
      return promise;
    }
    const round: ActiveRound = { id: this.nextId++, agent: roundAgent(context), state: startRound(request.questions), context, resolve, owner };
    const close = () => {
      if (this.active !== round) return;
      // The agent stopped waiting or the editor was lost: nothing is delivered and the overlay or the bar closes.
      this.active = undefined;
      this.changed();
      reject(context.signal.reason ?? questionAborted());
    };
    context.signal.addEventListener("abort", close, { once: true });
    this.active = round;
    if (this.shownRound() !== round) this.changed();
    else void Promise.resolve(this.reveal()).finally(() => this.changed());
    return promise;
  }

  /** The panel was opened or the developer asked to reopen the questions: the overlay is back where it was. */
  restore(): void {
    const round = this.shownRound();
    if (!round || !round.state.minimized) return;
    round.state = { ...round.state, minimized: false };
    this.changed();
  }

  /** The panel closed: the round goes out of sight and, as when the overlay is minimized, the Skip all confirmation closes. */
  panelClosed(): void {
    const round = this.shownRound();
    if (!round || round.state.confirming === null) return;
    round.state = { ...round.state, confirming: null };
    this.changed();
  }

  current(): QuestionRoundView | null {
    const round = this.shownRound();
    return round ? { id: round.id, agent: round.agent, state: round.state } : null;
  }

  /** The window's project changed: a round of that project comes back into sight, a round of another goes out of sight, and no answer is lost. */
  setProject(identity: string | undefined): void {
    if (identity === this.project) return;
    const wasShown = this.shownRound() !== undefined;
    this.project = identity;
    const round = this.shownRound();
    if (round && !wasShown) { void Promise.resolve(this.reveal()).finally(() => this.changed()); return; }
    this.changed();
  }

  /** An action of the developer from the panel. An action for another round, or one the state refuses, changes nothing. */
  act(id: number, action: QuestionAction): void {
    const round = this.shownRound();
    if (!round || round.id !== id) return;
    const step = applyQuestionAction(round.state, action);
    if (step.kind === "refused") {
      this.changed();
      return;
    }
    if (step.kind === "delivered") {
      this.active = undefined;
      this.changed();
      round.resolve(step.result);
      return;
    }
    round.state = step.state;
    // Typing is not echoed back: the panel already shows what was typed.
    if (action.type !== "setText") this.changed();
  }

  onChange(listener: Listener): { dispose(): void } {
    this.listeners.add(listener);
    return { dispose: () => void this.listeners.delete(listener) };
  }

  private changed(): void {
    const view = this.current();
    for (const listener of [...this.listeners]) listener(view);
  }

  /** The round the panel shows: the active one, while the window is on its project. */
  private shownRound(): ActiveRound | undefined {
    const round = this.active;
    return round && round.owner === this.project ? round : undefined;
  }
}
