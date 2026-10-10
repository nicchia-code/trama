---
status: resolved
resolution: proposal
refs:
  - requirements/ui#drift
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:43:56.215Z
---
# Drift details in the Diagram show a Points at list besides the two sides

## What happens

Selezionando il ghost di un Drift nel Diagramma, i dettagli mostrano il titolo e i due lati e, sotto, una sezione **Points at** con ogni riferimento del Drift: un link all'elemento quando si risolve, altrimenti la nota «no longer resolves».

## What should happen

`requirements/ui#drift`: i dettagli di un Drift nel Diagramma mostrano **solo il titolo e i due lati**, in due colonne, come la sua scheda nella colonna To decide.

## Fix options

### Remove the Points at section

Togliere dai dettagli del Drift la sezione con i riferimenti, così restano solo il titolo e i due lati. I riferimenti che non si risolvono restano comunque elencati nei dettagli del livello, sotto «Unresolved Drift references». Il developer perde i link diretti agli elementi dal dettaglio del Drift.

### Allow the references in the Requirement

Cambiare `requirements/ui#drift` perché i dettagli nel Diagramma possano mostrare, dopo i due lati, l'elenco dei riferimenti con il link all'elemento o la nota che non si risolve più. Il codice resta com'è; la scheda della Board resta diversa dai dettagli.

## Where in the code

extension/src/webview/diagram/details.ts (detailOfDrift)
