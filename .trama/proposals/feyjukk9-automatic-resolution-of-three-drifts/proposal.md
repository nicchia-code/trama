---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: 296dd3d9
    decision: fix-code
    option: 1
  - drift: kta57a6p
    decision: fix-code
    option: 1
  - drift: 6znriwbd
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-16T12:32:09.728Z
---
# Automatic resolution of three Drifts

Risoluzione automatica dei Drift autorizzati, ciascuno con la prima opzione di correzione del codice:

- 296dd3d9 – Dopo un controllo finale fallito, il Run automatico ferma anche i Task indipendenti: fix-code, «Continuare sui Task non bloccati dal lavoro fallito».
- kta57a6p – «Dismiss Drift» resta attivo quando il Drift sta in una risoluzione in scrittura: fix-code, «Contare anche le risoluzioni in scrittura nel blocco del pulsante».
- 6znriwbd – Settings non è subito dopo Requirements: fix-code, «Mettere Settings subito dopo Requirements».
