---
column: done
technical: false
refs:
  - requirements/ui#drift
  - diagram
drift: null
proposal: null
agent: false
created: 2026-10-14T16:26:19.143Z
finished: 2026-10-14T17:10:27.433Z
---
# Show every open Drift's details in the Diagram, also Drifts that point only at Requirements or at nothing drawn

Ogni Drift aperto deve avere i suoi dettagli disponibili nel Diagramma. Oggi un Drift compare nel Diagramma solo dove uno dei suoi riferimenti è un elemento del Modello visibile a quel livello. Un Drift che punta solo a Requisiti, o a elementi che non esistono più, non ha nodo né dettagli: il pulsante «View on diagram» della Board lo porta al Requisito o a un Diagramma senza selezione. Quando il Diagramma mostra un Drift aperto, i dettagli devono contenere i due lati, la sezione Points at con i riferimenti (link quando si risolvono, «no longer resolves» altrimenti) e i badge di urgenza e ricorrenza, anche per questi Drift.
