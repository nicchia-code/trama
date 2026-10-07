---
status: approved
base:
  requirements/rules/scan-hold.md: c4727c5e5ef6720026ee8867c0916b428170141e02697fec4ff97eee41c07799
delete: []
created: 2026-10-07T06:02:43.824Z
scanScope:
  - ref: requirements/rules#scan-hold
    reason: changed
---
# Hold scan: le approvazioni da riga di comando possono avviare la scansione automatica

Il Requisito rules#scan-hold dice che trama proposal approve e trama drift resolve --accept-proposal dalla riga di comando non avviano la scansione automatica. Il Diagram di agent-terminal (nessuna Transition su proposal.APPROVED esclude la riga di comando) e il codice, come deciso risolvendo il Drift nbtk5zny e poi il Drift lq5q1d41 (opzione Correggere il Requisito), la avviano invece come un'approvazione dal pannello.

Scelte da verificare:
- Si toglie solo l'inciso «come non avviano la scansione automatica»; resta che queste approvazioni non toccano il sospeso.
- Nessuna altra modifica al Modello o ai Requisiti.
