---
column: done
technical: false
refs:
  - proposal
  - requirements/ui#proposal
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:57.901Z
finished: 2026-10-09T08:25:16.247Z
---
# Show resolved Drifts in Proposal command-line views

Il developer deve vedere dalla riga di comando quali Drift una risoluzione risolve e come.

Quando è fatto:
- `trama proposal show` di una risoluzione ha, sotto l'elenco dei file, il blocco `Resolves Drifts`: una riga per Drift, nell'ordine di creazione dei Drift, con l'identità del Drift, il titolo e la decisione (`Model updated to match the code`, `Closed, nothing changes`, oppure `Code fixed with option <titolo dell'opzione>`), con il testo della nota per una correzione che ne ha una; un Drift già risolto in altro modo ha `(already resolved)` al posto della decisione. Con `--json` il tipo e la lista sono presenti.
- `trama proposal list` e `trama board` segnano una risoluzione con `(resolves N Drifts)`.
- Le altre Proposal si mostrano come prima.
