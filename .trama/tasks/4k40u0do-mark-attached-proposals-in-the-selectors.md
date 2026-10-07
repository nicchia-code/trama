---
column: done
technical: false
refs:
  - panel/Diagram
  - panel/Open/developer.SHOW_DIAGRAM
  - requirements/ui#proposal
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:04:38.229Z
finished: 2026-10-07T17:20:04.676Z
---
# Mark attached Proposals in the selectors and send their details to the Drift

Una Proposal allegata a un Drift aperto resta disegnabile, ma la decisione passa dal Drift.

- Nel selettore della Proposal disegnata del Diagramma e della scheda Requirements è elencata con il suffisso ` · <numero breve del Drift>`, per esempio `P3 Title · D2`.
- I suoi dettagli nel Diagramma non hanno Approve né Reject: al loro posto c'è il link `Decide on Drift D2` (numero breve, o identità se il Drift non ne ha), che seleziona quel Drift nel Diagramma e ne mostra i dettagli.
- Le Proposal non allegate, o allegate a un Drift già risolto, restano come oggi.
