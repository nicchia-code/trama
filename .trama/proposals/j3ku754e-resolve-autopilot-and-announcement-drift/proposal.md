---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: ugxjrbs6
    decision: fix-code
    option: 1
  - drift: gpo36r35
    decision: fix-code
    option: 1
  - drift: 93emt4dn
    decision: fix-code
    option: 1
  - drift: jc5k9o67
    decision: fix-code
    option: 1
  - drift: cvjzslzr
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T06:03:37.494Z
---
# Resolve autopilot and announcement Drifts

Risoluzione automatica: per ogni Drift si applica la prima opzione di correzione nel codice.

- D1 – Announcements of a resumed agent survive its terminal closing: correzione del codice (opzione 1, il terminale resta seguito per gli annunci fino alla chiusura).
- D3 – Closing or interrupting the resolution agent still starts its automatic Run: correzione del codice (opzione 1, la Run parte solo dopo una fine normale).
- D4 – A skipped question is later applied as an automatic fix: correzione del codice (opzione 1, i Drift saltati restano esclusi per la sessione).
- D5 – A scan's check declared after the scan ended still makes it a success: correzione del codice (opzione 1, il controllo arrivato dopo la fine viene ignorato).
- D6 – One invalid decision fails every Drift of an automatic resolution: correzione del codice (opzione 1, fallisce solo il Drift non valido).
