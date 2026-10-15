---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: null
proposal: null
agent: false
created: 2026-10-14T08:57:07.921Z
finished: 2026-10-14T10:01:40.336Z
---
# Refuse proposal new with both --resolution and --import

Con `trama proposal new` il developer o l'agente può passare insieme `--resolution` e `--import`: oggi la scelta del tipo prende `--import` in silenzio e ignora `--resolution`. Quando il comando riceve entrambi, deve essere rifiutato senza creare nessuna Proposal e dicendo che i due flag non vanno insieme.
