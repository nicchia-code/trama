---
status: approved
kind: resolution
drifts:
  - drift: elf8q0wm
    decision: fix-code
    option: 1
  - drift: nwgfx8es
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-17T21:40:15.989Z
---
# Lock delle Proposal

Risolve i Drift sul lock delle Proposal correggendo il codice:
- elf8q0wm – Proposal letta prima del lock: si corregge il codice, cercando la Proposal dal nome della cartella e dalla tabella dei numeri brevi, e aprendo il suo file solo dentro il lock.
- nwgfx8es – Lock vecchio rimosso alla cieca: si corregge il codice, spostando il lock vecchio con un nome unico prima di controllarne l'età, così un lock recente non viene mai cancellato.
