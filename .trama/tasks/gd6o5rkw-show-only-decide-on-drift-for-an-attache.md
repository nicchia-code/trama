---
column: done
technical: false
refs:
  - diagram
  - requirements/ui#proposal
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:28:12.121Z
finished: 2026-10-07T17:37:38.648Z
---
# Show only Decide on Drift for an attached Proposal in the level details

Quando nel Diagramma è disegnata una Proposal allegata a un Drift aperto e non è selezionato nulla, i dettagli del livello (System, Feature, Machine o State) mostrano la Proposal con i pulsanti Approve e Reject, che il Requisito vieta.

A lavoro finito:
- con nessuna selezione, i dettagli del livello mostrano per una Proposal allegata a un Drift aperto il link `Decide on Drift <id>` al posto di Approve e Reject, come già accade quando si seleziona un elemento che la Proposal cambia;
- il link seleziona quel Drift nel Diagramma e ne mostra i dettagli;
- una Proposal non allegata, o allegata a un Drift già risolto, mantiene Approve e Reject nei dettagli del livello;
- un test copre i dettagli del livello con una Proposal allegata disegnata.
