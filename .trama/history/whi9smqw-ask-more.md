---
created: 2026-10-23T10:20:07.633Z
updated: 2026-10-24T11:22:52.327Z
summary: Ask more opens an empty omp Chat conversation on a Proposal, Task, Drift or round question; nothing reaches the agent until the developer writes the first message.
tasks:
  - j6tlxyad
  - s7rkxe5c
  - vbvnrojj
  - jke5wsit
cleared:
  jke5wsit:
    title: Ask more vuota
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T10:56:13.619Z
    refs:
      - developer.ASK_MORE
      - developer.SEND_CHAT_MESSAGE
      - question-round/On question/developer.ASK_MORE
      - panel/Board/developer.ASK_MORE
      - announcement
      - requirements/rules#developer.ASK_MORE
      - requirements/tech#developer.ASK_MORE
      - requirements/ui#developer.ASK_MORE
      - requirements/data#omp-chat-conversation
  vbvnrojj:
    title: Modali della Board con Ask more
    proposal: x6bguwt0
    tag: Ask more
    finished: 2026-10-23T10:18:46.816Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#developer.ASK_MORE
      - requirements/ui#panel/Board
      - requirements/ui#panel
      - requirements/ui#proposal
      - requirements/ui#task
      - requirements/ui#drift
      - requirements/tech#proposal
  s7rkxe5c:
    title: Ask more nelle domande
    proposal: x6bguwt0
    tag: Ask more
    finished: 2026-10-23T10:11:53.081Z
    refs:
      - question-round/On question/developer.ASK_MORE
      - requirements/data#question-round
  j6tlxyad:
    title: Lancio di Ask more
    proposal: x6bguwt0
    tag: Ask more
    finished: 2026-10-23T10:07:49.956Z
    refs:
      - agent-launching
      - developer.ASK_MORE
      - requirements/rules#agent-terminal
      - requirements/rules#developer.ASK_MORE
      - requirements/tech#developer.ASK_MORE
---
# Ask more

Ask more on a Proposal, Task, Drift or round question opens a new omp Chat conversation with the chosen agent, named Ask <short number> or Ask question, and focuses its message field. Nothing is sent when it opens: the first message the developer writes goes out once, with the card or question, its links, Trama's read commands and the text. Until then the field shows a placeholder such as 'Ask about the Task…' and Send stays disabled while omp starts. With omp Chat off, Ask more still starts its instruction in the terminal at once. The chat explains and changes cards only on request; the round of questions stays unchanged. Implemented by Task jke5wsit.
