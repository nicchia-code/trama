---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: d686hxw4
origin: null
critical: false
option: 1
note: null
resolvedBy: rmrw5bde
created: 2026-10-17T13:35:21.442Z
---
# La scheda rossa di un Drift ha un terzo pulsante, oltre a Resolve e Dismiss Drift

## What happens

La scheda di un Drift in Blocked ha, oltre a **Resolve** e **Dismiss Drift**, un pulsante «View on diagram» o «View requirement» sul primo riferimento. Un Drift senza riferimenti non ha questo pulsante.

## What should happen

Il Modello dice che la scheda ha **due pulsanti**: **Resolve**, che chiede all'agente di risolvere quel Drift, e **Dismiss Drift**. Il collegamento al Diagramma o al Requisito è già nei riferimenti della scheda, mostrati come chip cliccabili: il pulsante in più non è previsto.

## Fix options

### Togliere il pulsante e tenere i chip

La scheda mostra solo **Resolve** e **Dismiss Drift**; i riferimenti restano chip cliccabili che portano al Diagramma o alla scheda Requirements, come già fanno. Costo: nessuno sul collegamento; il developer che cerca «View on diagram» trova il chip del riferimento.

### Far diventare il titolo il collegamento

Il pulsante sparisce e il titolo del Drift porta al primo riferimento, sul Diagramma o nei Requisiti. Costo: il titolo diventa un controllo, quindi serve un nome accessibile e un tooltip che dicano dove porta. La scheda resta con i due soli pulsanti.

## Where in the code

extension/src/webview/board/render.ts, funzione drift: il pulsante costruito sul primo riferimento (View on diagram / View requirement), aggiunto prima di Resolve.
