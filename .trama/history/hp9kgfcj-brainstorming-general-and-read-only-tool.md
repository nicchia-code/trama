---
created: 2026-10-24T14:06:35.366Z
updated: 2026-10-24T14:06:35.366Z
summary: General is an instruction-led brainstorming chat, and omp Chat tool calls are read-only rows that show a failed call's error line.
tasks:
  - b15fwq9d
  - x9nzooyj
cleared:
  x9nzooyj:
    title: Chiamate non cliccabili
    proposal: mm4ym4ea
    tag: Chiamate fisse
    finished: 2026-10-24T13:58:50.508Z
    refs:
      - omp-chat-conversation
      - requirements/ui#omp-chat-conversation
      - requirements/tech#omp-chat-conversation
  b15fwq9d:
    title: General per il brainstorming
    proposal: yqjkm55b
    tag: General brainstorming
    finished: 2026-10-24T13:47:19.804Z
    refs:
      - omp-chat-general
      - requirements/rules#omp-chat-general
---
# Brainstorming General and read-only tool calls

The fixed General instruction now frames General as a brainstorming chat that does not start work by itself. In every omp Chat conversation a tool call row is read-only (icon, title, state) and a failed call shows the first line of omp's error under it; the openFile message of omp Chat is removed.
