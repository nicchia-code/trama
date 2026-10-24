---
column: done
technical: false
refs:
  - task/To do/agent.MOVE_TASK_TO_DOING
  - task/In progress/agent.MOVE_TASK_TO_DOING
  - task/Taken by the agent
  - task/Done/agent.MOVE_TASK_TO_DOING
  - requirements/rules#task
  - requirements/rules#task/Taken by the agent
  - requirements/data#task
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:24:05.142Z
---
# Only launched agents hold Tasks

When this Task is done, a Task taken by the agent always belongs to a known Trama terminal or omp Chat conversation, and only that holder works on it, reports its progress and releases it.

Taking a Task. A move of the agent to In progress (`TRAMA_AGENT=1`), from To do, from In progress (picking it up or keeping it) or from Done, takes the Task only when the command runs with a recognised `TRAMA_TERMINAL`: the terminal Trama started for the agent or the omp Chat conversation that counts as the terminal it replaces. Without a recognised `TRAMA_TERMINAL` the move is refused: the Task is neither taken nor moved, and the command exits with an error saying that only an agent launched by Trama can take a Task. The blocked-Task refusal (naming the blocking Drift or the fix Task waited for) stays as it is. The developer, without `TRAMA_AGENT`, moves Tasks from the command line as before, and `task move <id> doing` on a taken Task still takes it back.

No Task without a holder. Tasks taken "without known terminal" no longer exist: the agent never writes `agent: true`, and the `agent` field of a taken Task is always the ID of the terminal or conversation that took it (its sub-agents included), or `false`. When a Task file is read, any other value — `true`, `editor`, or a Cursor-era value such as `cursor` or `cursor:<conversation>` — is not an error and is not read specially: the Task counts as one that nobody holds (not taken), without rewriting the file. Today `agentField` in `src/core/work.ts` rejects the Cursor values, maps `editor` to an anonymous holder and keeps `true` as taken with no holder; all of that goes.

Releasing. Every end of the holder's work releases the Tasks carrying its mark and sends them back to To do: the hook saying idle in a terminal, the end of the command running in the agent terminal, the close of that terminal (by anyone, `trama.autoExit` included), the close of the conversation or the exit of its omp process, the execution check (`time.CHECK_DUE`, `agent.CHECK_TASK`), and the new `omp-acp.TURN_ENDED`: omp answering the prompt of the omp Chat conversation that took the Task with the end of the turn. In a conversation this replaces the hook's idle report, which no longer arrives there. The end of a terminal or conversation releases only the Tasks carrying its own mark, never another holder's and never a Task without a holder: `releaseTasks` no longer releases Tasks whose holder is null. A release forgets the Task's declared percentage. The liveness rules of the execution check themselves (asking the owning window, the recorded process recognised by pid and start time) are not part of this Task; `trama task check` no longer has an `unknown-holder` answer, since a taken Task always has a holder.

Progress. A declaration of progress (`task move <id> doing` with `progress`) is accepted only for a Task In progress and taken by the agent, from the agent that holds it: the same Trama terminal or omp Chat conversation (`TRAMA_TERMINAL`, its sub-agents included). There is no longer any agent that may declare for a Task "taken without a known terminal". A declaration from another terminal or conversation, from an agent without a recognised `TRAMA_TERMINAL`, from the developer, or on a Task not taken changes nothing, prints a note saying why and exits with 0. The percentage stays in `.trama/progress/` as before and is forgotten whenever the Task leaves Taken by the agent.
