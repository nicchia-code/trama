---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: ns1im2cl
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-14T10:17:31.729Z
---
# Resolve identity rewrite Drift

Risoluzione automatica dei Drift delegati.

- D2 – Identity rewrite writes Proposals before it has read every Task and Drift: correggere il codice con la prima Fix option (Leggere tutte le schede prima di scrivere), così la riscrittura delle identità controlla ogni scheda numerata prima di scrivere e, se si ferma, non cambia nulla.
