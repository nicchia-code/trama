---
refs:
  - omp-chat-general
---
# General identity and ACP limits

When done, General's process has an identity of the same form as a terminal's, and its opening and closing follow the same ACP rules as the other conversations.

- The identity given to General's process as `TRAMA_TERMINAL` is generated like a terminal's (`newTerminalId`, six lowercase letters or digits), no longer `randomUUID()` (`extension/src/host/omp-chat/general.ts`), so Trama's command line recognises it (`terminalFromEnv` accepts only `^[a-z0-9]{6}$`). What the agent announces or files from General, when the developer asks, reaches the Board as General's, and its question rounds are bound to General. Delivered cards do not wait for a turn end, since General has no hook and produces no `omp-acp.TURN_ENDED`; announcements still waiting are withdrawn, with the non-delivery notice, when its process ends or General is cleared. A resumed General keeps its saved identity.
- General still has no ghost, no launch announcement, does not keep the execution check running, does not count for Run exclusion or Resolve Drifts and is never refused for another running job.
- The opening, resume included, has one time limit for the whole opening; a failure shows the reason inside the conversation with the last lines of omp's error output, never opens a terminal or an editor notice, and Trama retries only when the developer sends the next message (Starting → Stopped on `omp-acp.START_FAILED`, Resuming → Starting on `omp-acp.SESSION_NOT_RESUMED`).
- A closed connection counts as omp exiting by itself (`omp-acp.EXITED`: Ready → Stopped, Kept after switch-off → Absent).
- When Trama stops General's process (clear, switch-off, closing, deactivation) it first cancels the turn and closes the session, then terminates omp with every command omp started (its process group).
