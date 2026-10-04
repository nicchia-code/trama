# Question round

A group of related decisions the agent asks the developer to make together. The agent submits all questions of a round at once. The editor presents them in order, remembers answers when the developer goes back, and returns the round immediately when its last question is answered or skipped. There is no final review step.

The round belongs to the window that started the agent terminal, or otherwise the most recently focused window with the project open. The developer sees which agent asked it. Queued rounds do not replace the one being answered. Trama imposes no response deadline; if the agent stops waiting, its round is removed and any visible question closes without delivering answers.

If the editor is lost after accepting the round, the round is interrupted and all its answers are discarded. The agent is told that the editor was lost and stops the workflow awaiting these decisions, without a fallback, automatic recommendation or automatic resumption. Initial editor unavailability remains a separate case.

## States

### Not asked (initial)
The round has not been requested yet.
- `agent.ASK_QUESTIONS` → Unanswered: the editor is not reachable for the project. Tells the agent the editor is unavailable so it can use its own question interface.
- `agent.ASK_QUESTIONS` → Queued: the editor is reachable but another round is being presented in the same window.
- `agent.ASK_QUESTIONS` → Asking: the editor is reachable and no other round is being presented in the same window. Opens the first question immediately.

### Queued
Another round is being answered. This round waits its turn without showing a question.
- `ROUND_CLOSED` → Asking: a different round in the same window has closed and this is the oldest round still waiting. Opens the first question.
- `agent.STOP_WAITING` → Abandoned: removes this round from the queue.
- `editor.DISCONNECTED` → Interrupted: the editor window serving this round is lost. Removes the round and tells the agent to stop the workflow awaiting its decisions.

### Asking
The developer is answering this round. Answers are kept while moving backwards and forwards. Losing focus does not close the current question.
- `agent.STOP_WAITING` → Abandoned: closes the visible question and delivers no answers.
- `editor.DISCONNECTED` → Interrupted: the editor window serving this round is lost. Closes any remaining controls, discards the round's answers and tells the agent to stop the workflow awaiting its decisions.

#### On question (initial)
The developer sees the current question and its choices. The recommended choice starts selected on the first visit.
- `developer.CHOOSE_ANSWER` → On question: a choice or set of choices is accepted, no free answer was requested and another question remains. Remembers the answer and opens the next question.
- `developer.CHOOSE_ANSWER` → Answered: the last question is accepted without requesting a free answer. Returns all answers and any skips immediately.
- `developer.CHOOSE_OTHER` → Writing answer: the developer chooses to give a free answer, alone or alongside choices in a multiple-choice question. Keeps any selected choices while the answer is written.
- `developer.GO_BACK` → On question: only after the first question. Returns to the preceding question with its remembered answer.
- `developer.PRESS_ESCAPE` → Confirming skip: no question is skipped yet and existing answers are kept.

#### Writing answer
The developer is writing a free answer to the current question.
- `developer.WRITE_ANSWER` → On question: the answer is not empty and another question remains. Remembers the free answer and any selected choices and opens the next question.
- `developer.WRITE_ANSWER` → Answered: the answer is not empty and this is the last question. Returns all answers and any skips immediately.
- `developer.PRESS_ESCAPE` → On question: returns to the same question without accepting the free answer or skipping it.
- `developer.GO_BACK` → On question: returns to the same question without accepting the free answer or skipping it.

#### Confirming skip
The developer chooses whether to skip this question, skip all remaining questions, or return to the same question. Answers already accepted are kept.
- `developer.SKIP_QUESTION` → On question: another question remains. Marks only the current question as skipped and opens the next one.
- `developer.SKIP_QUESTION` → Answered: this is the last question. Marks it as skipped and returns the round immediately.
- `developer.SKIP_ALL_QUESTIONS` → Answered: marks the current and all remaining questions as skipped and returns the round, keeping preceding answers.
- `developer.GO_BACK` → On question: returns to the same question without changing its answer.
- `developer.PRESS_ESCAPE` → On question: equivalent to going back; skips nothing.

### Answered (final)
The agent has received each question's choices, free answer or explicit skip. For each skipped question it applies its recommendation and lists it as a decision for the developer to verify.

### Unanswered (final)
The editor was not reachable when the round was requested. The agent has received an explicit editor-unavailable result, not skipped or invented answers, and asks through its own question interface instead.

### Abandoned (final)
The agent no longer waits for this round. It is removed, with no answers delivered and no recommendation silently applied.

### Interrupted (final)
The editor was lost while the round was queued or being answered. The round is removed and every answer of this incomplete round is discarded. The agent receives an explicit interruption error and stops the workflow awaiting these decisions. It does not use a fallback question interface, apply recommendations, retry or resume the round.

## Events

### ROUND_CLOSED
Emitted when a round leaves Asking for Answered or Abandoned. Allows the oldest round still queued in the same window to open, if any. Closing a queued round does not emit this event or interrupt the active round. Annulla anche l'avviso al developer su quel round, se ancora in attesa (vedi il Notice).
