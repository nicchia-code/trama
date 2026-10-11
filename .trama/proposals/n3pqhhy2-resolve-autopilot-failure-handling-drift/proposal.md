---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: ojunkr29
    decision: fix-code
    option: 1
  - drift: 6vgjf04b
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T05:46:59.355Z
---
# Resolve autopilot failure handling drifts

Risoluzione automatica dei Drift delegati:
- D1 Resolve Drifts sends failed automatic cases back to automatic retry: correggere il codice (opzione 1, i casi falliti o esclusi vanno al giro di domande manuale).
- D2 A refused automatic start marks its Drifts or Tasks as failed: correggere il codice (opzione 1, un avvio rifiutato rilascia la prenotazione e lascia i casi idonei).
