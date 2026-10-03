import type { QuestionPresenter } from "../../../src/core/question-rounds";

/**
 * The only thing about question rounds that the Board and the quiet period learn: whether one is being answered, and
 * when the last one closed. Nothing about the questions or the answers is kept here.
 */
let open = 0;
let closedAt = 0;
const listeners = new Set<() => void>();

export const questionRoundOpen = (): boolean => open > 0;

/** When the last round closed, in milliseconds; 0 if none has yet. */
export const questionRoundClosedAt = (): number => closedAt;

export function onQuestionRoundChange(listener: () => void): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

function changed() {
  for (const listener of [...listeners]) listener();
}

/** A presenter that tells when a round starts to be shown and when it closes, whatever way it ends. */
export function trackRound(present: QuestionPresenter): QuestionPresenter {
  return async (request, context) => {
    open++;
    changed();
    try {
      return await present(request, context);
    } finally {
      open--;
      closedAt = Date.now();
      changed();
    }
  };
}
