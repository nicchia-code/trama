---
status: resolved
resolution: fix-code
refs:
  - diagram/State level
  - diagram/Machine level
  - diagram/State level/developer.OPEN_STATE_LEVEL
proposal: null
task: 25c38hui
origin: null
option: 1
note: null
resolvedBy: 207t8egb
created: 2026-10-09T19:21:21.317Z
---
# States can be expanded in place at the State level, the Model allows it only at the Machine level

## What happens

Al **livello di uno Stato** i sotto-Stati che hanno a loro volta sotto-Stati hanno lo stesso pulsante di espansione del livello della Machine (sul canvas e nei dettagli, **Expand**/**Collapse**): si aprono **sul posto** e mostrano i loro sotto-Stati dentro di sé.

Di conseguenza, da un livello di Stato il developer può fare Drill in su uno Stato disegnato dentro un sotto-Stato espanso e aprire il livello di uno Stato **di due o più gradini più in basso**, non di un sotto-Stato diretto di quello mostrato.

## What should happen

Il Modello prevede l'espansione sul posto **solo al livello della Machine** ("States with sub-States can be expanded in place"); il livello di uno Stato non la descrive.

Da State level a State level `developer.OPEN_STATE_LEVEL` apre solo **un sotto-Stato che ha a sua volta sotto-Stati**, oppure, con il breadcrumb, uno Stato che contiene quello mostrato.

## Fix options

### Togliere l'espansione al livello di uno Stato

Al livello di uno Stato i sotto-Stati restano sempre chiusi: niente pulsante di espansione sul canvas né **Expand**/**Collapse** nei dettagli, solo **Drill in**. Così da lì si apre solo un sotto-Stato diretto. Il Modello non cambia; il developer perde la vista annidata a quel livello e scende un livello alla volta.

### Prevedere l'espansione anche al livello di uno Stato nel Modello

Il Modello dice che anche al livello di uno Stato i sotto-Stati si espandono sul posto, e che da lì Drill in apre ogni Stato disegnato dentro quello mostrato che ha sotto-Stati. Il codice resta com'è. Il developer tiene la vista annidata; costa una modifica al Modello del Diagram.

### Espandere al livello di uno Stato ma aprire solo i sotto-Stati diretti

Al livello di uno Stato l'espansione sul posto resta, ma Drill in (canvas e dettagli) è offerto solo sui sotto-Stati diretti di quello mostrato; gli Stati più in basso si aprono espandendo o dal livello del sotto-Stato. Il Modello deve comunque descrivere l'espansione al livello di uno Stato; il comportamento di Drill in diventa diverso fra i nodi.

## Where in the code

extension/src/webview/diagram/index.ts (`toggleState`, che accetta anche il livello di uno Stato); extension/src/webview/diagram/levels.ts (`buildGraph` passa gli Stati espansi anche al livello di uno Stato, `drillTarget`); extension/src/webview/diagram/graph.ts (`hasHandles`); extension/src/webview/diagram/details.ts (`detailOfElement`, `toggle` e `drill` di uno Stato)
