---
status: resolved
resolution: proposal
refs:
  - panel/Diagram
  - requirements/ui#drift
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: mi0ehofo
created: 2026-10-16T05:25:11.530Z
---
# Il Diagramma permette di scartare un Drift dai suoi dettagli

## What happens

Nei dettagli di un Drift aperto, il Diagramma mostra il pulsante **Dismiss Drift**, che chiude il Drift senza cambiare né codice né Modello. Il pulsante è attivo quando nessuna risoluzione lo contiene e nessun agente sta risolvendo i Drift. Il developer può quindi scartare un Drift dal Diagramma.

## What should happen

Il Modello dice che i dettagli di un Drift mostrano titolo, due lati e riferimenti, **senza nessun modo di decidere su di lui**; scartare un Drift resta solo dalla riga di comando. I Requisiti dicono lo stesso: né la scheda né i dettagli hanno pulsanti per decidere sul Drift, e nel pannello si decide sui Drift solo con Resolve Drifts.

## Fix options

### Togliere il pulsante dai dettagli del Diagramma

I dettagli di un Drift nel Diagramma tengono titolo, due lati e riferimenti, e perdono il pulsante **Dismiss Drift**. Scartare un Drift senza modifiche resta nella riga di comando, come dice il Modello. Costo: dal pannello non si scarta più dal Diagramma; la scheda della Board ha lo stesso pulsante e non cambia con questa opzione.

### Togliere il pulsante da Diagramma e Board

Il pulsante **Dismiss Drift** sparisce sia dai dettagli del Diagramma sia dalla scheda del Drift nella Board, così ogni Drift si decide solo con Resolve Drifts o dalla riga di comando, come dicono i Requisiti. Costo: la Board perde la chiusura rapida di un Drift senza Proposal.

## Where in the code

extension/src/webview/diagram/panel.ts (render: il blocco del Drift con dismissButton); extension/src/webview/diagram/index.ts (renderPanel e il passaggio di actions.dismiss); extension/src/webview/dismiss.ts; extension/src/protocol.ts (messaggio dismissDrift)
