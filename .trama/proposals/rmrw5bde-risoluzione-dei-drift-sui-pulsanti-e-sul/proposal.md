---
status: approved
kind: resolution
drifts:
  - drift: o7s7c3u0
    decision: fix-code
    option: 1
  - drift: i74g4olu
    decision: fix-code
    option: 1
  - drift: vnm6f202
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-17T13:41:27.411Z
---
# Risoluzione dei Drift sui pulsanti e sulle schede della Board

Risolve tre Drift della Board, tutti correggendo il codice:

- `o7s7c3u0` – La scheda rossa di un Drift ha un terzo pulsante, oltre a Resolve e Dismiss Drift: si corregge il codice, la scheda ha solo Resolve e Dismiss Drift e i riferimenti restano chip che portano al Diagramma o ai Requisiti.
- `i74g4olu` – Il Run di un Task è disabilitato mentre un altro Task è preso dall'agente: si corregge il codice, il Run di un Task libero resta disponibile e si ferma solo per un Run in corso, per la risoluzione dei Drift o per il turno dell'agente che ha consegnato la scheda.
- `vnm6f202` – La scheda di attesa scompare quando i Task che aspettano sono tutti presi dall'agente: si corregge il codice, la scheda di attesa resta in Blocked finché almeno un Task aspetta il Task di correzione, anche senza righe.
