---
column: done
technical: false
refs:
  - diagram/State level/developer.OPEN_STATE_LEVEL
drift: yjj23atu
proposal: null
agent: false
created: 2026-10-06T16:27:29.546Z
finished: 2026-10-06T16:31:53.980Z
---
# Fix code to match the Model: Il pulsante Drill in apre il livello di uno Stato fuori da quello mostrato

## What happens

Al **livello di uno Stato**, una Transizione che esce verso uno Stato fuori da quello mostrato disegna quello Stato come nodo esterno. Se lo si seleziona e ha sotto-Stati, i dettagli offrono **Drill in**, che apre il livello di quello Stato: uno Stato che **non è un sotto-Stato** di quello mostrato.

Sul canvas lo stesso nodo esterno non si apre con il doppio clic: il comportamento dipende da dove si clicca.

## What should happen

Dal livello di uno Stato si apre il livello di un altro Stato **solo per un sotto-Stato che ha a sua volta sotto-Stati** (`developer.OPEN_STATE_LEVEL` da State level a State level). Uno Stato esterno raggiunto da una Transizione non è un sotto-Stato di quello mostrato.

## Chosen option

**Togliere Drill in dai nodi esterni**

I dettagli di uno Stato disegnato come nodo esterno non offrono più Drill in, come già il doppio clic sul canvas. Il developer raggiunge quello Stato con il breadcrumb o con un link, che portano al livello della Machine. Cambio piccolo, nessuna perdita: lo Stato resta raggiungibile da altre strade.

## Where in the code

extension/src/webview/diagram/details.ts (`detailOfElement`, caso state: `drill` ignora `node.external`, a differenza di `toggle`); extension/src/webview/diagram/levels.ts (`drillTarget`, che invece esclude i nodi esterni)
