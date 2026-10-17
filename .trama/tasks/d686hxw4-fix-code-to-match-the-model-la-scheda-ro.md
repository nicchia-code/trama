---
column: done
technical: false
refs:
  - panel/Board
drift: o7s7c3u0
proposal: null
agent: false
created: 2026-10-17T13:42:06.706Z
finished: 2026-10-17T13:55:47.345Z
---
# Fix code to match the Model: La scheda rossa di un Drift ha un terzo pulsante, oltre a Resolve e Dismiss Drift

## What happens

La scheda di un Drift in Blocked ha, oltre a **Resolve** e **Dismiss Drift**, un pulsante «View on diagram» o «View requirement» sul primo riferimento. Un Drift senza riferimenti non ha questo pulsante.

## What should happen

Il Modello dice che la scheda ha **due pulsanti**: **Resolve**, che chiede all'agente di risolvere quel Drift, e **Dismiss Drift**. Il collegamento al Diagramma o al Requisito è già nei riferimenti della scheda, mostrati come chip cliccabili: il pulsante in più non è previsto.

## Chosen option

**Togliere il pulsante e tenere i chip**

La scheda mostra solo **Resolve** e **Dismiss Drift**; i riferimenti restano chip cliccabili che portano al Diagramma o alla scheda Requirements, come già fanno. Costo: nessuno sul collegamento; il developer che cerca «View on diagram» trova il chip del riferimento.

## Where in the code

extension/src/webview/board/render.ts, funzione drift: il pulsante costruito sul primo riferimento (View on diagram / View requirement), aggiunto prima di Resolve.
