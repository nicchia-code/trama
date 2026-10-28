---
column: done
technical: false
refs:
  - project/Trama project
  - project
drift: null
proposal: null
agent: false
created: 2026-10-27T07:10:57.534Z
finished: 2026-10-27T10:05:11.841Z
---
# Riscrittura delle identità

Il Model prevede il comando dello sviluppatore che assegna un’identità permanente a ogni Proposal, Task e Drift numerato ancora vivo, rifiuta i duplicati, aggiorna i riferimenti tra le card e non fa commit. Nel codice non esiste alcuna implementazione di questo comportamento. La documentazione (docs/cli.md e CHANGELOG.md) riporta però che il comando `trama ids rewrite` è stato rimosso di proposito: prima di implementare, lo sviluppatore deve decidere se la transizione resta nel Model o se il Model va aggiornato.
