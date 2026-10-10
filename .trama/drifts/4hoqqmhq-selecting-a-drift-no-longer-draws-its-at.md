---
status: resolved
resolution: proposal
refs:
  - developer.CHOOSE_DRAWN_PROPOSAL
  - diagram
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:43:50.141Z
---
# Selecting a Drift no longer draws its attached Proposal, the Model still says it does

## What happens

Selezionare un Drift nel Diagramma, o arrivarci dalla Board, **non cambia la Proposal disegnata**: la Proposal allegata al Drift non è mai disegnata sopra il Modello, e un link che chiede di disegnarla è ignorato. Il Diagramma resta sulla Proposal scelta dal developer e sul suo livello.

Così fanno anche `requirements/ui#proposal` (nessuna parte del pannello mostra una Proposal allegata a un Drift aperto) e la descrizione del Diagram in `panel`.

## What should happen

La descrizione dell'Evento `developer.CHOOSE_DRAWN_PROPOSAL` dice ancora che il developer cambia la Proposal disegnata anche quando **seleziona un Drift che porta con sé una Proposal diversa da quella disegnata**, con i ripieghi del livello del Diagramma che ne seguono.

## Fix options

### Update the Event description

Togliere dalla descrizione di `developer.CHOOSE_DRAWN_PROPOSAL` la selezione di un Drift: l'Evento nasce solo dal selettore e dai link a una Proposal disegnabile. Il codice resta com'è ed è già coerente con i Requisiti e con la descrizione del pannello. Costa una piccola modifica al Modello.

### Draw the attached Proposal again

Rimettere nel codice il disegno della Proposal allegata quando si seleziona il suo Drift. Contraddice `requirements/ui#proposal` e la descrizione del Diagram, che andrebbero cambiati anche loro, e riporta in vista una Proposal su cui il pannello non permette più di decidere.

## Where in the code

extension/src/webview/diagram/index.ts (navigateDrift, apply); extension/src/webview/board/logic.ts (proposalsToDecide)
