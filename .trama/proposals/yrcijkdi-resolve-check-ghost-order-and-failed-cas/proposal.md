---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: oft1dgty
    decision: fix-code
    option: 1
  - drift: 87fnebdi
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T05:30:00.919Z
---
# Resolve check ghost order and failed case release

Risoluzione automatica dei Drift:

- D1 – A finished check removes its ghost before its outcome is sent to the editor: si corregge il codice, l'esito viene inviato all'editor prima di rimuovere il ghost (Fix option 1).
- D2 – A developer's Run releases failed automatic cases as if it were a developer scan: si corregge il codice, solo le scansioni avviate dal developer rilasciano i casi falliti (Fix option 1).
