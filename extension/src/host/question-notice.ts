import type { QuestionPresenter } from "../../../src/core/question-rounds";
import type { NoticeService } from "./notices";

/**
 * Lets a round that is shown to the developer give birth to one notice, if an agent that Trama started in a terminal
 * asked it. The ten seconds start when the round is shown, and nothing the developer does in the round restarts them.
 * Whatever way the round closes, the notice that still waits is cancelled. The notice says which question is in front of
 * the developer when it leaves; nothing here changes how the round is presented.
 */
export function noticeOnQuestion(present: QuestionPresenter, notices: NoticeService, project: string): QuestionPresenter {
  return async (request, context) => {
    if (context.fromTramaTerminal !== true) return present(request, context);
    let index = 0;
    let closed = false;
    const notice = notices.start(() => {
      const question = request.questions[index];
      if (closed || question === undefined) return undefined;
      return { kind: "question", project, step: index + 1, total: request.questions.length, question: question.question, options: question.options.map((option) => option.label) };
    });
    try {
      return await present(request, {
        ...context,
        onQuestion: (position) => {
          index = position;
          context.onQuestion?.(position);
        },
      });
    } finally {
      closed = true;
      notice?.cancel();
    }
  };
}
