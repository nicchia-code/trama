import { parseQuestionRequest, questionAborted, QuestionInterruptedError, unavailableQuestions, type QuestionContext, type QuestionRequest, type QuestionResult } from "./questions";

export type CompletedQuestionRound = Extract<QuestionResult, { status: "answered" }>;
export type QuestionPresenter = (request: QuestionRequest, context: QuestionContext & { signal: AbortSignal }) => Promise<CompletedQuestionRound>;

interface PendingRound {
  request: QuestionRequest;
  context: QuestionContext;
  controller: AbortController;
  resolve(result: QuestionResult): void;
  reject(error: unknown): void;
  cancel(): void;
  finished: boolean;
}

/** One in-memory FIFO and presentation lifetime per editor window. */
export class QuestionRoundQueue {
  private pending: PendingRound[] = [];
  private active: PendingRound | undefined;
  private closed = false;

  constructor(private readonly present: QuestionPresenter) {}

  ask(request: QuestionRequest, context: QuestionContext): Promise<QuestionResult> {
    const validated = parseQuestionRequest(request);
    if (context.signal?.aborted) return Promise.reject(questionAborted());
    if (this.closed) return Promise.resolve(unavailableQuestions());
    return new Promise((resolve, reject) => {
      const round: PendingRound = {
        request: validated, context, controller: new AbortController(), resolve, reject,
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

  private next(): void {
    if (this.closed || this.active) return;
    const round = this.pending.shift();
    if (!round) return;
    this.active = round;
    // Start immediately, but also consume synchronous presentation failures.
    let presented: Promise<CompletedQuestionRound>;
    try {
      presented = this.present(round.request, { ...round.context, signal: round.controller.signal });
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
