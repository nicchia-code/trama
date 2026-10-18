---
status: approved
kind: resolution
drifts:
  - drift: 0ednohho
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-18T06:23:24.405Z
---
# Drift cercato dopo il lock

Risolve un Drift sull'ordine fra la ricerca del Drift citato e il lock della Proposal.

- 0ednohho – Drift citato prima del lock: si corregge il codice (fix-code, opzione «Cercare il Drift dopo il lock»): il comando prende prima il lock della Proposal e cerca il Drift citato solo dentro il lock, così nessun file della Proposal si legge prima di averlo.
