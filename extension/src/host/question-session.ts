import type { PresentationContext, QuestionPresenter } from "../../../src/core/question-rounds";
import { questionAborted } from "../../../src/core/questions";
import { applyQuestionAction, type QuestionAction, type QuestionRoundState, startRound } from "./question-state";

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

  /**
   * `reveal` opens the panel in front, on the Diagram, or brings it to the front keeping its tab (the round entered
   * Asking). `agentName` names the agent that asked, when it can be told.
   */
  constructor(
    private readonly reveal: () => void | Promise<void>,
    private readonly agentName: (context: PresentationContext) => string | null = () => null,
  ) {}

  readonly present: QuestionPresenter = (request, context) =>
    new Promise((resolve, reject) => {
      if (context.signal.aborted) {
        reject(context.signal.reason ?? questionAborted());
        return;
      }
      const round: ActiveRound = { id: this.nextId++, agent: this.agentName(context), state: startRound(request.questions), context, resolve };
      const close = () => {
        if (this.active !== round) return;
        // The agent stopped waiting or the editor was lost: nothing is delivered and the overlay or the bar closes.
        this.active = undefined;
        this.changed();
        reject(context.signal.reason ?? questionAborted());
      };
      context.signal.addEventListener("abort", close, { once: true });
      this.active = round;
      context.onQuestion?.(round.state.current);
      void Promise.resolve(this.reveal()).finally(() => this.changed());
    });

  /** The panel was opened or the developer asked to reopen the questions: the overlay is back where it was. */
  restore(): void {
    const round = this.active;
    if (!round || !round.state.minimized) return;
    round.state = { ...round.state, minimized: false };
    this.changed();
  }

  current(): QuestionRoundView | null {
    const round = this.active;
    return round ? { id: round.id, agent: round.agent, state: round.state } : null;
  }

  /** An action of the developer from the panel. An action for another round, or one the state refuses, changes nothing. */
  act(id: number, action: QuestionAction): void {
    const round = this.active;
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
    const previous = round.state;
    round.state = step.state;
    if (step.state.view === "question" && (previous.view !== "question" || previous.current !== step.state.current)) round.context.onQuestion?.(step.state.current);
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
}
