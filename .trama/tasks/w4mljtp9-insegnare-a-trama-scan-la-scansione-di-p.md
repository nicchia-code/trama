---
column: done
technical: true
refs:
  - requirements/tech#scan-hold
  - requirements/rules#scan-hold
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-07T05:20:49.865Z
finished: 2026-10-07T05:42:47.035Z
---
# Insegnare a trama-scan la scansione di più Proposal insieme

Quando l'istruzione nomina più Proposal, la skill `trama-scan` legge `## Scan scope` di ognuna con `trama proposal show <id>`, confronta una sola volta l'unione dei riferimenti con il Modello attuale e lega ogni Task con `--proposal` alla Proposal più recente il cui ambito contiene il riferimento o un elemento che lo contiene. Annuncia un solo controllo per tutta la scansione in sospeso. La skill distribuita e quella installata dall'aggiornamento delle skill dicono lo stesso.
