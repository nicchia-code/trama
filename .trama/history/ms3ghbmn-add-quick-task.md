---
created: 2026-10-22T05:18:10.426Z
updated: 2026-10-22T05:18:52.314Z
summary: Dal pulsante diviso in fondo a Backlog si apre una chat Quick nuda con omp o Cursor, senza istruzione, skill, scansioni né schede; prove manuali ancora da fare.
tasks:
  - mkbm1zyt
  - 4cs5e9n4
cleared:
  4cs5e9n4:
    title: Chat Quick con omp e Cursor
    proposal: ylacwi4x
    tag: Quick Task
    finished: 2026-10-22T05:16:45.438Z
    refs:
      - agent-launching
      - agent-terminal
      - announcement
      - requirements/rules#developer.OPEN_QUICK_TASK
      - requirements/tech#developer.OPEN_QUICK_TASK
      - requirements/rules#agent-terminal
      - requirements/tech#agent-terminal
  mkbm1zyt:
    title: Pulsante diviso Add Quick Task
    proposal: ylacwi4x
    tag: Quick Task
    finished: 2026-10-22T05:13:06.837Z
    refs:
      - panel/Board
      - developer.OPEN_QUICK_TASK
      - requirements/ui#developer.OPEN_QUICK_TASK
      - requirements/ui#panel/Board
      - requirements/ui#panel
---
# Add Quick Task

In fondo a Backlog, + Add Work Item diventa un pulsante diviso: la parte principale apre ancora la richiesta di design scritta, la freccetta apre un menu con la voce Add Quick Task. Scegliendola il webview manda `openQuickTask` all'host, che apre subito una chat nuova e nuda con l'agente configurato: con omp un terminale `Quick` in Agent running, con Cursor una chat di Cursor, usando il modello del ruolo `trama.execution`. Le prove manuali nel pannello reale (Esc, ritorno del focus, clic fuori, focus in Cursor) sono in `docs/uat.md`.
