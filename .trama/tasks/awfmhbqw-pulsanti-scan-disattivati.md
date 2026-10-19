---
column: done
technical: false
refs:
  - panel/Board
  - panel/Diagram
  - panel/Open/developer.SHOW_BOARD
  - panel/Open/developer.SHOW_DIAGRAM
  - panel/Get Started/developer.INITIALIZE_PROJECT
  - panel/Get Started/workspace.MODEL_CHANGED
  - requirements/ui#panel
drift: null
proposal: ld5527fo
agent: false
created: 2026-10-19T20:15:55.261Z
finished: 2026-10-19T20:25:05.438Z
---
# Pulsanti Scan disattivati

Fatto quando, con l'Advisor Scanner attivo (`trama.experimentalAdvisorScanner` acceso e `trama.agent` su omp):
- il pulsante `Scan System` della barra della Board e `Scan` della barra del Diagramma, a livello di Sistema e di Feature, restano al loro posto ma sono disabilitati, con l'etichetta di sempre senza `· N`, l'icona `search` e il tooltip `Scans are off: the Advisor Scanner checks the code during Runs.`; il nome accessibile ripete etichetta e tooltip;
- il quadro mandato al pannello porta lo stato dell'Advisor Scanner, così i pulsanti tornano normali, con il numero dei Task finiti dall'ultimo scan, al quadro successivo a un cambio dell'impostazione o dell'agente;
- con l'Advisor Scanner non attivo (impostazione spenta o agente diverso da omp) i pulsanti sono quelli di oggi.
