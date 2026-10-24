---
refs:
  - time
  - requirements/tech#time
  - requirements/rules#time
  - requirements/rules#agent.CHECK_TASK
  - requirements/quality#agent-terminal
  - requirements/data#drift-resolution
---
# Execution check liveness

The execution check of each window looks only at certain facts, never polls what its window owns for sure, and can no longer be fooled by a reused process number or a lost registration.

When this Task is done:

- The check runs once when the window opens the project (after the withdrawal of orphan ghosts) and then every 60 seconds, but only while the window has a job running in a terminal, the project has a Task taken by the agent, or the project has an announcement owned by no terminal or conversation of this window. The omp Chat conversations of the window neither arm the timer nor are checked: their end comes from the process exit or from the closing of the ACP connection. `OmpConversations.check` and the polling of conversation pids go.
- The per-user registry `agents-<project id>.json` maps each terminal or conversation identity to `{ pid, started, processStart, window }`. For a terminal it is written when `agent-started` arrives; for a job conversation the host writes it as soon as `spawn` succeeds. Every read-modify-write of the file happens under the lock of `src/core/file-lock.ts`, through a temporary file then renamed. An entry without `processStart` (written by an earlier version) counts as a process that cannot be recognised, that is, gone.
- A recorded process is alive only if `process.kill(pid, 0)` does not give `ESRCH` and its start time, read again, matches `processStart` within 2 seconds. The start time is read on Linux from `/proc/<pid>/stat` (field 22, with `btime` from `/proc/stat`), on macOS with `ps -o lstart= -p <pid>`, on Windows with `powershell -NoProfile -NonInteractive -Command` on `(Get-Process -Id <pid>).StartTime`, through `execFile`, no shell, fixed arguments, 5 s timeout, and only for a holder no window follows. An unreadable or different start time counts as gone.
- Who follows a holder: the window asks first the window recorded in the registry entry, then every other live window of the project, with `followed-holders`; each window answers with its terminals in Agent running and its job conversations, including those it is about to resume, and its General. A window whose record does not connect, and a window that connects but does not answer within one second, follow nothing; for holders nobody follows the recorded process decides.
- A Task whose holder nobody follows and whose recorded process is not alive or missing goes back to To do with the notice `Trama stopped following <short number> <title>: no window follows its agent.`; an announcement in the same situation is withdrawn with the notice of an announcement not delivered (none for a `work`). The check of a terminal's own job is unchanged.
- `trama task check <id>` gives four answers: alive (with the holder), released (with the reason), not taken by the agent, cannot verify. The answer for a Task "taken without a known holder" is gone.
- Acceptance as in the quality requirement of the agent terminal: omp killed with `SIGKILL` in a terminal (Run closed within a minute, Tasks released, ghosts withdrawn), a live idle omp that stays running, a reloaded window whose live omp keeps its Task and ghosts, a Task left after the editor closed released at the next opening, a Task whose recorded process died and whose number was reused released, a second window on the same project that does not withdraw the first one's ghosts, and `trama task check` in its four answers.
