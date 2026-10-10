---
status: resolved
resolution: proposal
refs:
  - panel/Diagram
  - requirements/ui#drift
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: s1fhgqej
created: 2026-10-10T09:18:24.535Z
---
# Drift details in the Diagram list Points at, the Diagram State still says only the title and the two sides

## What happens

Selezionando un Drift nel Diagramma, i dettagli mostrano il titolo e i due lati e, sotto, una sezione **Points at** con ogni riferimento del Drift: un link all'elemento quando si risolve, altrimenti la nota `no longer resolves`. Nessun controllo per decidere sul Drift.

È quanto chiede `requirements/ui#drift` dopo la risoluzione del Drift 8hja6jhz (Proposal 48s86zzo).

## What should happen

Lo Stato **Diagram** del pannello dice che i dettagli di un Drift mostrano **solo il titolo e i due lati**, senza nessun modo di decidere. La Proposal 48s86zzo ha ammesso Points at nel Requisito ma non ha toccato questa frase, che ora contraddice sia il codice sia `requirements/ui#drift`.

La stessa frase «solo il titolo e i due lati» resta anche nella descrizione della Machine `drift`.

## Fix options

### Amend the Model to allow Points at

Lo Stato Diagram (e la frase uguale nella Machine `drift`) dice che i dettagli di un Drift mostrano il titolo, i due lati e i riferimenti del Drift, senza modo di decidere. Nessun cambio di codice; Modello e Requisito tornano d'accordo con la decisione già presa su 8hja6jhz.

### Drop the Points at section

Togliere dai dettagli del Drift la sezione Points at e cambiare `requirements/ui#drift` per toglierla anche dal Requisito. I riferimenti irrisolti restano visibili nei dettagli del livello. Il developer perde i link diretti agli elementi dal dettaglio, e si rimette in discussione la decisione presa su 8hja6jhz.

## Where in the code

extension/src/webview/diagram/details.ts (detailOfDrift); extension/src/webview/diagram/panel.ts (render, Drift branch)
