---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: nuhf1ci1
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T09:28:42.098Z
---
# Resolve coordinator send reservations drift

Risoluzione automatica:
- Drift D1 – A coordinator that loses its role keeps the sends it had reserved: correzione del codice con la prima opzione (azzerare le prenotazioni quando il ruolo si perde).
