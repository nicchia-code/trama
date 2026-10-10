---
column: done
technical: true
refs:
  - requirements/ui#proposal
drift: null
proposal: null
agent: false
created: 2026-10-09T08:45:13.083Z
finished: 2026-10-09T10:03:17.331Z
---
# Leave out the note of an already resolved Drift in trama proposal show

Nel blocco `Resolves Drifts` di `trama proposal show` una risoluzione elenca anche i Drift già risolti in altro modo, con `(already resolved)` al posto della decisione. Oggi, se la decisione registrata per quel Drift era una correzione con nota, la riga stampa comunque ` · <nota>` dopo `(already resolved)`, come se approvare la risoluzione correggesse ancora il codice con quella nota. Il pannello (scheda della Board e dettagli nel Diagramma) invece non mostra la nota per quel Drift.

Fatto quando: in `trama proposal show` la riga di un Drift già risolto in altro modo porta solo numero breve, titolo e `(already resolved)`, senza nota, sia nel testo sia nel campo `resolvesDrifts` di `--json`, così il blocco è lo stesso del pannello come chiede `requirements/ui#proposal`; la nota resta per i Drift ancora aperti con decisione di correzione.
