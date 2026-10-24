---
refs:
  - agent-hook
  - requirements/tech#agent-hook
---
# Hook inside ACP conversations

The agent hook (`extension/src/omp/trama-hook.ts`, built as `dist/omp-hook.js`) keeps doing in an omp Chat conversation only what must happen inside omp, and stops relaying the start and the end of the work, which Trama now knows from the process it started and from omp's answer to the prompt.

When this Task is done:

- The extension puts `TRAMA_ACP=1` in the environment of every omp Chat conversation of a job (and saves it with the other variables kept for resumption). With `TRAMA_ACP` set, the hook never runs `trama hook start <pid>` nor `trama hook idle`: `agent-hook.STARTED` and `agent-hook.IDLE` are produced only by terminals Trama started. Without `TRAMA_ACP` (the omp terminal) the hook behaves exactly as today: `trama hook start` once for the main session, `trama hook idle` on `session_stop`/`session_shutdown` of the main session, 3 s timeout, errors ignored.
- In every session, main and sub-agents, in terminals and conversations alike, the hook still refuses omp's `ask` tool with the refusal text, without contacting the editor, still claims files during a Run and still clears a sub-agent's claims when it finishes (`agent-hook.SOTTO_AGENTE_FINITO`).
- The editor ignores an `agent-started` or `agent-idle` message that arrives for the identity of an omp Chat conversation; for a terminal it registers the process together with its start time (see the execution check) and treats `agent-idle` as today.
- The `agent-alive` handler of the local channel, kept for hooks of older versions, is gone; an unknown message is refused like any other.
