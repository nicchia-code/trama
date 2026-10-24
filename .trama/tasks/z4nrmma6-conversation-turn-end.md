---
column: done
technical: false
refs:
  - omp-chat-conversation
  - requirements/tech#omp-chat-conversation
  - requirements/tech#omp-chat-conversation/Waiting for the window
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:17:54.194Z
---
# Conversation work ends on turn end

When done, the end of a job conversation's work in omp Chat is omp's answer to the prompt over ACP, never a signal from the hook, and Trama follows the conversation's process only from the process it started.

- `OmpSession.run` (`extension/src/host/omp-chat/client.ts`) reports the `stopReason` of the `session/prompt` response. The response to the job's prompt (or to the message that continues it after a resume or a `promptRequired`), when no developer message is queued or waiting for delivery, is the Event `omp-acp.TURN_ENDED` with its `stopReason`. Ask more and General produce no `TURN_ENDED`; after Agent idle a new turn end changes nothing.
- In Agent running, `omp-acp.TURN_ENDED` replaces `agent-hook.IDLE` in `src/core/omp-chat-conversation.ts`: with `trama.autoExit` on the conversation goes to Closed (Trama stops the process, the conversation disappears with the agent's last line), with it off to Agent idle; in both cases the Run ends, taken Tasks are released and announcements withdrawn as with the idle hook in a terminal. When the turn ended for an abnormal reason (the model refused, the token limit or the request limit was reached, or omp refused the prompt) the notice at the top of the Board says why; `end_turn` and Stop show nothing. A prompt refused by omp ends the job with its reason instead of leaving it running (today `sendPrompt(first).catch(() => {})` swallows it).
- `agent-hook.IDLE` and `agent-hook.STARTED` no longer exist for conversations: the conversation's environment carries `TRAMA_ACP=1` (alongside the terminal environment and `TRAMA_TERMINAL`), the host no longer handles `agent-idle`/`agent-started` for a conversation, and the `idleEarly` flag of `extension/src/host/omp-chat/conversations.ts` disappears with the race it covered.
- The pid and start time of the spawned process go into the per-user process registry (`src/core/agent-processes.ts`), written by the host as soon as `spawn` succeeds; `registeredProcess ?? session.pid` gives way to the started process alone.
- An `exit` of the process not requested by Trama, or the connection closing (`connection.closed`) without `exit`, is `omp-acp.EXITED`, once: Agent running → Closed with Run, taken Tasks and announcements ending as for the end of the terminal's command, and the Board notice giving the reason with the last lines of omp's error output; Agent idle → Closed. A process stopped by Trama produces no `EXITED`.
- `developer.STOP_CHAT_AGENT` cancels the turn (`session/cancel`) and interrupts the question round the conversation was waiting on, if any; what follows is decided by omp's answer to the prompt.
- The execution check no longer looks at the processes of its own window's conversations: `OmpConversations.check`, `time.CHECK_DUE` in the conversation machine and the pid polling disappear; a conversation of another window, or left after a reload, is checked only through the process registry.
- Resume (Waiting for the window): the saved entry carries an explicit field telling whether the conversation runs with the hook (a job), instead of `resume` looking for `--hook` among the arguments; the new process gets the same arguments and environment (same `TRAMA_TERMINAL`, `TRAMA_ACP=1`) and its pid/start time are recorded like at opening. `omp-acp.SESSION_RESUMED` → Agent running (fixed message asking to continue, view shown without focus) or Agent idle; `omp-acp.SESSION_NOT_RESUMED` (including the whole-opening time limit) → Closed, the entry is deleted and, if the agent was working, Run, taken Tasks and announcements end as for a vanished agent with the Board notice. A Task taken by a conversation to resume is not released at window opening before the resume outcome.
- A start failure (spawn error, exit or `initialize`/`session/new` error before the instruction is delivered, or the opening time limit) still launches the same instruction in the omp terminal with the same announcement and job (`extension/src/host/agent.ts`), and the notice carries the reason with the tail of omp's stderr.
- Tests `bun:test` in `src/core` cover the new transitions of the conversation machine.
