---
status: resolved
resolution: fix-code
refs:
  - diagram/State level/developer.OPEN_STATE_LEVEL
proposal: null
task: k7p0ecu8
origin: null
option: 1
note: null
created: 2026-10-06T16:24:31.178Z
---
# Il pulsante Drill in apre il livello di uno Stato fuori da quello mostrato

## What happens

Al **livello di uno Stato**, una Transizione che esce verso uno Stato fuori da quello mostrato disegna quello Stato come nodo esterno. Se lo si seleziona e ha sotto-Stati, i dettagli offrono **Drill in**, che apre il livello di quello Stato: uno Stato che **non è un sotto-Stato** di quello mostrato.

Sul canvas lo stesso nodo esterno non si apre con il doppio clic: il comportamento dipende da dove si clicca.

## What should happen

Dal livello di uno Stato si apre il livello di un altro Stato **solo per un sotto-Stato che ha a sua volta sotto-Stati** (`developer.OPEN_STATE_LEVEL` da State level a State level). Uno Stato esterno raggiunto da una Transizione non è un sotto-Stato di quello mostrato.

## Fix options

### Togliere Drill in dai nodi esterni

I dettagli di uno Stato disegnato come nodo esterno non offrono più Drill in, come già il doppio clic sul canvas. Il developer raggiunge quello Stato con il breadcrumb o con un link, che portano al livello della Machine. Cambio piccolo, nessuna perdita: lo Stato resta raggiungibile da altre strade.

### Portare il Drill in esterno al livello della Machine

Su un nodo esterno il pulsante non apre il livello di quello Stato ma il **livello della Machine** con lo Stato selezionato e i suoi genitori aperti, come un link. Il developer non perde la scorciatoia, ma il pulsante si comporta diversamente dagli altri Drill in e va spiegato nel tooltip.

## Where in the code

extension/src/webview/diagram/details.ts (`detailOfElement`, caso state: `drill` ignora `node.external`, a differenza di `toggle`); extension/src/webview/diagram/levels.ts (`drillTarget`, che invece esclude i nodi esterni)
