---
column: done
technical: false
refs:
  - omp-acp
  - requirements/tech#omp-acp
  - requirements/ui#time
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:17:54.914Z
---
# ACP connection hardening

The extension talks to every omp process it starts as an ACP server (job conversations, Ask more, General) only over the ACP connection and from the process it owns, and every end, failure and stop of that process is certain and explained.

When this Task is done:

- `omp-acp.TURN_ENDED`: for a job conversation (one that loads Trama's hook), the answer to `session/prompt` for the job's prompt (or for the message that continues it after a resumption or a `promptRequired`) is the end of the agent's work, provided no developer message is waiting to be delivered (queued `waiting`, `_session/steering` with `queue`, or held behind a permission request): then the answer of the turn that delivers it is the one that counts. It carries the `stopReason`. `end_turn` and `cancelled` (Stop) are normal ends; `refusal`, `max_tokens` and `max_turn_requests` are abnormal ends; an error answer (omp refuses the prompt, for example for authentication or for the model) is an abnormal end with omp's message. Errors of `session/prompt` are no longer swallowed (`sendPrompt(...).catch(() => {})` in `OmpClient.open` and in `continue-work` go). Ask more and General produce no TURN_ENDED.
- An abnormal end, besides ending the work like any end of turn, shows at the top of the Board, in the style of the execution check notices and with the `Close` button, `The agent of <job> stopped: <reason>.`, where `<job>` is the conversation's name and `<reason>` is `the model refused to continue`, `the model reached its token limit`, `the model reached its request limit` or `omp refused the prompt (<omp's message>)`. A normal end shows nothing.
- `omp-acp.EXITED` is produced once when the process exits without Trama stopping it, and also when the ACP connection closes while the process is still there. Its reason, like the reasons of `START_FAILED`, `SESSION_NOT_RESUMED` and of a job whose conversation could not open, ends with the last lines omp wrote on stderr: the host keeps in memory the last 40 lines, at most 4 KB, of the process's stderr instead of discarding it. For a job, the Board notice is `Trama stopped following <job>: omp exited (<code or signal>).` with those lines behind `Show details`.
- One time limit of 30 seconds covers the whole opening: `spawn`, `initialize` and `session/new`, or the reopening of a saved session, for job conversations, Ask more and General. When it is exceeded the process is stopped as below and the opening fails (a job falls back to the omp terminal as today; General shows the reason in the conversation; a resumption is `SESSION_NOT_RESUMED`).
- Stopping a process (closing a conversation, clearing General, `trama.autoExit`, switching omp Chat off, deactivating the extension) sends `session/cancel` when a turn is running, then `session/close` waiting at most 2 seconds (skipped on deactivation), then `SIGTERM` to omp's whole process group (the process starts with `detached: true` on Linux and macOS; on Windows `taskkill /T /PID <pid>`), then `SIGKILL` to the group after 3 seconds. No command started by omp survives the conversation.
- The ACP client keeps no fallback for omp older than 18.12.6: the `session/set_model` fallback, the `omp models --json` fallback of a session's model list, the path without `_session/steering` and the choice between `session/load` and `session/resume` (`reopenMethod` in `src/core/omp-acp.ts`) go; the client uses what omp 18.12.6 declares, and an `initialize` that does not declare it is a failed start with the reason. `omp models --json` for the Settings suggestions stays.
