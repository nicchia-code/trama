---
created: 2026-10-24T18:32:25.677Z
updated: 2026-10-24T18:32:25.677Z
summary: Conversations with Trama's hook end their work at omp's answer, and autoExit is read from user settings only.
tasks:
  - jrhf90vk
  - waksk8py
cleared:
  waksk8py:
    title: autoExit solo dall'utente
    proposal: ijuvpwzo
    tag: omp Chat auto exit
    finished: 2026-10-24T18:32:06.584Z
    refs:
      - requirements/quality#agent-launching
      - requirements/tech#agent-launching
  jrhf90vk:
    title: Fine turno in omp Chat
    proposal: ijuvpwzo
    tag: omp Chat auto exit
    finished: 2026-10-24T18:29:47.060Z
    refs:
      - omp-chat-conversation
      - omp-acp.TURN_ENDED
      - requirements/tech#omp-acp.TURN_ENDED
      - requirements/tech#omp-chat-conversation/Waiting for the window
---
# omp Chat turn end and autoExit

Conversations with Trama's hook (design, Setup, rework, import and the other jobs) now end their work when omp answers the prompt of the work, whether or not they have a job, so with autoExit on they close and with it off they go to rest. Resuming an Ask more conversation saved as running reopens it at rest with no fixed prompt. trama.autoExit is read through one function that uses the user value only: it is on unless the user value is false, so a workspace value never turns it off.
