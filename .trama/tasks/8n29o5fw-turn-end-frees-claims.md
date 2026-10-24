---
column: done
technical: false
refs:
  - prenotazione-file/Prenotato/omp-acp.TURN_ENDED
  - prenotazione-file/Prenotato/time.CHECK_DUE
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:37:39.466Z
---
# Release claims of ended holders

A file claimed by a sub-agent of a Run is released, without waiting for the claim to expire (two hours without a write, `CLAIM_TTL_MS` in `src/core/claims.ts`), in two more cases. An omp Chat conversation counts as the terminal it replaces: its claims carry the conversation's identity as their terminal.

- Turn end: when omp answers the prompt of the omp Chat conversation of the sub-agent that holds the file with the end of the turn, no sub-agent of that conversation works any more, and every claim of that conversation is forgotten (`releaseTerminalClaims`), as the hook at rest does for a terminal. This happens through the same end of work the hook at rest uses (`endAgentWork` in `extension/src/host/agent.ts`), since in conversations the hook no longer reports idle.
- Execution check: besides the claims released when the check closes the work of the holder's terminal, the check finds the claims whose terminal or conversation no open window follows any more and whose agent process is gone, and forgets every claim of that terminal or conversation. Liveness is decided as for Task holders: this window first, then the other open windows of the project are asked (a window that does not answer in time follows nothing); when none follows the holder, its process recorded in the per-user registry is checked, recognised by pid and start time. An unreadable registry releases nothing. Today only Tasks are released this way (`releaseUnfollowedTasks` in `extension/src/host/task-release.ts`); claims of an unfollowed holder are left to expire.

Writes of other agents to a released file then go on as from Libero.
