---
status: approved
kind: resolution
drifts:
  - drift: azgtt3mu
    decision: proposal
  - drift: 327gy306
    decision: fix-code
    option: 1
  - drift: 767dmxe8
    decision: proposal
base:
  work/feature.md: 3049c0063e281545311b76fc938e5bbc23b76f7847c084aca6b0b2c648329abd
  requirements/ui/board.md: 3db01eebfbb6513cc1263ecef9ad11b2f04f5c1cfbd82cc3772be7d4d4cbd5cf
delete: []
created: 2026-10-17T12:48:29.949Z
---
# Risoluzione dei Drift sulla Board e sulla Feature work

Risolve tre Drift.

- azgtt3mu Riga di un Task bloccato: tag e icona prima del titolo — si tiene la forma attuale della riga (pallino, ID, tag e icona «Also blocked by» sopra, titolo sotto, come la scheda del Task in Active): il Requisito della Board lo dice (proposal).
- 327gy306 Scheda di attesa: il titolo non porta al Task di correzione — il titolo della scheda di attesa diventa un collegamento alla scheda del Task di correzione in Active (fix-code).
- 767dmxe8 La Feature work descrive ancora lo smistamento delle Machine — si adottano le modifiche della Proposal allegata: la Feature work descrive il confronto diretto di ogni Machine, senza smistamento (proposal).
