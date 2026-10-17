---
status: approved
kind: resolution
drifts:
  - drift: xtklegfc
    decision: fix-code
    option: 1
  - drift: l419uuy6
    decision: fix-code
    option: 1
  - drift: mjt17y3l
    decision: fix-code
    option: 1
  - drift: o527nb31
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-17T17:07:37.291Z
---
# Risoluzione dei Drift su script di prova, Resolve singolo e skill della delega

Risolve quattro Drift, tutti con una correzione nel codice:

- xtklegfc – Lo script di prova chiede un comando dell'agente che Trama non legge più: si corregge il codice, lo script propone solo la scelta di omp in trama.agent.
- l419uuy6 – Resolve su un solo Drift in una finestra che non coordina non avvia la correzione automatica: si corregge il codice, la finestra inoltra il Drift scelto al coordinatore.
- mjt17y3l – Skill descrivono impostazioni di delega inesistenti: si corregge il codice, le tre skill nominano trama.driftAutoPilot e i suoi tre valori.
- o527nb31 – Resolve su un solo Drift limita le raccolte successive: si corregge il codice, un avvio rifiutato non lascia la scelta del Drift alle raccolte successive.
