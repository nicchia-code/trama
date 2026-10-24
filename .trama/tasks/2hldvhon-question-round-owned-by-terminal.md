---
column: done
technical: false
refs:
  - question-round
  - requirements/tech#question-round
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:35:04.958Z
---
# Rounds owned by their terminal

Every question round an agent asks belongs to the terminal or omp Chat conversation that Trama launched and in which that agent runs (sub-agents included), and to the window that follows it. Only an agent Trama launched can ask a round.

When done:

- `trama question new` sends a round only when both `TRAMA_QUESTION_ENDPOINT` and a recognised `TRAMA_TERMINAL` are in its environment. Without either it prints the `unavailable` result at once (exit 0, the existing reason text that does not name the agent's question tool), without looking for a window through the runtime records by focus recency. The focus-recency discovery (`liveEditor` in `src/core/question-channel.ts`) is no longer used by `askEditor`; it stays only for the other commands that still need it. The `fromTramaTerminal` flag is replaced by the terminal identity.
- The `ask` message carries `terminal` (the value of `TRAMA_TERMINAL`). The window accepts the round only for a terminal or conversation it opened and that still exists, working or idle, General included; otherwise it answers `unavailable` and the round ends Unanswered (`agent.ASK_QUESTIONS` → Unanswered: an omp started by hand or a command from the developer's own shell is never shown a round). Stale records are not a reachable editor.
- The extension host (`extension/src/host/questions.ts`, `question-session.ts`) keeps, for each queued or open round, the terminal or conversation that asked it, and interrupts every round of that terminal or conversation with the shared `editor-interrupted` error, discarding all its answers, when:
  - the developer stops the conversation's turn (`developer.STOP_CHAT_AGENT`);
  - the conversation is closed (`developer.CLOSE_CHAT_CONVERSATION`) or its omp process exits (`omp-acp.EXITED`, a closed connection counts as exiting);
  - the agent's command ends in its terminal (`terminal.COMMAND_ENDED`) or the terminal is closed (`terminal.CLOSED`);
  - the execution check stops following it (`time.CHECK_DUE`).
  This holds both in Queued (the round is just removed) and in Asking (the overlay or the bar closes). Interrupting a queued round never touches the round being answered. Losing the editor (`editor.DISCONNECTED`) still interrupts every round as today.
- A round that leaves Asking for Answered, Abandoned or Interrupted while its window stays open emits `ROUND_CLOSED`, so the oldest round still queued in that window opens (its first question over the panel, which opens or comes to the front). Closing a queued round emits nothing.
- A round of a prepared question (`developer.ASK_AGENT`, asked by Trama itself from Resolve on a Drift) has no terminal and is interrupted only by the loss of the editor.
- The agent, if still running, receives the explicit interruption error and stops the workflow awaiting those decisions: no fallback, no recommendation applied, no retry or automatic resumption. Initial editor unavailability stays a separate `unavailable` result.
- Trama's round is the only way an agent asks the developer in Trama's terminals and conversations: the hook refuses the agent's own question tool with `QUESTION_TOOL_REFUSAL` (`src/core/questions.ts`), and in a job conversation of omp Chat the ACP client also declines any form omp asks to show, with the same text. Outside Trama's conversations the agent's tool works as usual; Ask more and General keep omp's own form.
- `docs/cli.md` says that `trama question new` answers `unavailable` when run outside a terminal or conversation launched by Trama.
