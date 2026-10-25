---
created: 2026-10-24T15:41:22.335Z
updated: 2026-10-24T15:41:22.335Z
summary: Every question round belongs to the terminal or conversation Trama launched, and the overlay names it.
tasks:
  - 2hldvhon
  - amsymnao
cleared:
  amsymnao:
    title: Overlay names the asking terminal
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:35:05.727Z
    refs:
      - requirements/ui#question-round
  2hldvhon:
    title: Rounds owned by their terminal
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:35:04.958Z
    refs:
      - question-round
      - requirements/tech#question-round
---
# Question rounds owned by terminals

`trama question new` sends a round only with `TRAMA_QUESTION_ENDPOINT` and a recognised `TRAMA_TERMINAL`; the window ignores unknown terminals, interrupts a terminal's rounds when it ends, and the overlay header shows the tab name of the asking terminal or conversation.
