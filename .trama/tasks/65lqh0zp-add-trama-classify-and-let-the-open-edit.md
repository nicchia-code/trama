---
column: done
technical: false
refs:
  - work
  - agent-launching
  - requirements/rules#work
  - requirements/tech#agent-launching
  - requirements/quality#agent-launching
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:24.993Z
finished: 2026-10-07T15:11:39.140Z
---
# Add trama classify and let the open editor ask Jev whether a Machine is in conflict

Quando è fatto, `trama classify --machine <id>` legge lo stato da standard input e scrive una sola parola: `conflict`, `no-conflict` o `unavailable`, uscendo con 0; esce con errore solo per una Machine inesistente o un input vuoto.
- Il comando trova l'editor del progetto come `trama ask` e gli passa Machine e stato; non vede mai la chiave.
- Risponde `unavailable` senza editor, con `trama.system1` vuota o senza chiave salvata; senza System 1 nulla lascia la macchina.
- L'editor chiama Jev come dicono i Requisiti `tech`, con al più 10 secondi e senza bloccarsi: probabilità almeno 0,2 → `conflict`, sotto → `no-conflict`; errore di rete, HTTP non 2xx, timeout o risposta senza probabilità → `conflict`, con una riga sul motivo su standard error.
