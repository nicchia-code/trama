---
created: 2026-10-22T05:18:10.426Z
updated: 2026-10-22T05:18:52.314Z
summary: Dal pulsante diviso in fondo a Backlog si apre una chat Quick nuda con omp o Cursor, senza istruzione, skill, scansioni né schede; prove manuali ancora da fare.
tasks:
  - mkbm1zyt
  - 4cs5e9n4
---
# Add Quick Task

In fondo a Backlog, + Add Work Item diventa un pulsante diviso: la parte principale apre ancora la richiesta di design scritta, la freccetta apre un menu con la voce Add Quick Task. Scegliendola il webview manda `openQuickTask` all'host, che apre subito una chat nuova e nuda con l'agente configurato: con omp un terminale `Quick` in Agent running, con Cursor una chat di Cursor, usando il modello del ruolo `trama.execution`. Le prove manuali nel pannello reale (Esc, ritorno del focus, clic fuori, focus in Cursor) sono in `docs/uat.md`.
