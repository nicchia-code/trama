import { parseQuestionRequest, questionAborted, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionRequest, type QuestionResult } from "./questions";

export type CompletedQuestionRound = Extract<QuestionResult, { status: "answered" }>;
export interface PresentationContext extends QuestionContext {
  signal: AbortSignal;
}
export type QuestionPresenter = (request: QuestionRequest, context: PresentationContext) => Promise<CompletedQuestionRound>;

interface PendingRound {
  request: QuestionRequest;
  context: QuestionContext;
  controller: AbortController;
  resolve(result: QuestionResult): void;
  reject(error: unknown): void;
  cancel(): void;
  finished: boolean;
  present: QuestionPresenter;
}

/** One in-memory FIFO and presentation lifetime per editor window. `onIdle` runs each time the last round leaves the queue. Each round is presented by the presenter it was asked with, so rounds of several projects share one queue. */
export class QuestionRoundQueue {
  private pending: PendingRound[] = [];
  private active: PendingRound | undefined;
  private closed = false;

  constructor(private readonly present: QuestionPresenter, private readonly onIdle?: () => void) {}

  /** True while a round is presented or waiting to be presented. */
  get busy(): boolean {
    return this.active !== undefined || this.pending.length > 0;
  }

  ask(request: QuestionRequest, context: QuestionContext, present: QuestionPresenter = this.present): Promise<QuestionResult> {
    const validated = parseQuestionRequest(request);
    if (context.signal?.aborted) return Promise.reject(questionAborted());
    if (this.closed) return Promise.resolve(unavailableQuestions());
    return new Promise((resolve, reject) => {
      const round: PendingRound = {
        request: validated, context, controller: new AbortController(), resolve, reject, present,
        finished: false,
        cancel: () => {
          const error = questionAborted();
          round.controller.abort(error);
          this.finish(round, undefined, error);
        },
      };
      context.signal?.addEventListener("abort", round.cancel, { once: true });
      this.pending.push(round);
      this.next();
    });
  }

  /** Editor loss is not caller cancellation: interrupt the entire window atomically. */
  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    const rounds = this.active ? [this.active, ...this.pending] : this.pending;
    this.active = undefined;
    this.pending = [];
    for (const round of rounds) {
      const error = new QuestionInterruptedError();
      round.controller.abort(error);
      this.finish(round, undefined, error);
    }
  }

  /**
   * Interrupts every round, presented or queued, whose context `matches`, with the shared interruption error: its answers are discarded. Rounds that do not
   * match stay as they are; a queued round that matches is just removed, and the round being presented is touched only when it matches itself. When the
   * presented round is interrupted the oldest round still queued opens (`question-round.ROUND_CLOSED`).
   */
  interrupt(matches: (context: QuestionContext) => boolean): void {
    if (this.closed) return;
    const hit = [...(this.active ? [this.active] : []), ...this.pending].filter((round) => matches(round.context));
    // The queued rounds that match leave first, so the next round to open is never one of them.
    this.pending = this.pending.filter((round) => !hit.includes(round));
    for (const round of hit) {
      const error = new QuestionInterruptedError();
      round.controller.abort(error);
      this.finish(round, undefined, error);
    }
  }

  private next(): void {
    if (this.closed || this.active) return;
    const round = this.pending.shift();
    if (!round) { this.onIdle?.(); return; }
    this.active = round;
    // Start immediately, but also consume synchronous presentation failures.
    let presented: Promise<CompletedQuestionRound>;
    try {
      presented = round.present(round.request, { ...round.context, signal: round.controller.signal });
    } catch (error) {
      this.finish(round, undefined, error);
      return;
    }
    void presented.then(
      (result) => this.finish(round, result),
      (error: unknown) => this.finish(round, undefined, error),
    );
  }

  private finish(round: PendingRound, result?: CompletedQuestionRound, error?: unknown): void {
    if (round.finished) return;
    round.finished = true;
    round.context.signal?.removeEventListener("abort", round.cancel);
    if (this.active === round) this.active = undefined;
    else {
      const index = this.pending.indexOf(round);
      if (index !== -1) this.pending.splice(index, 1);
    }
    if (result) round.resolve(result);
    else round.reject(error);
    // Release references to accepted answers in the presenter by aborting its controls
    // before opening another round. The completed result itself is already detached.
    if (!round.controller.signal.aborted) round.controller.abort();
    this.next();
  }
}
