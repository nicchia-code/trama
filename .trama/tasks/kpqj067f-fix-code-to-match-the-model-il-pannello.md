---
column: done
technical: false
refs:
  - panel/Open
drift: kg3zhprs
proposal: null
agent: false
created: 2026-10-16T06:07:43.683Z
finished: 2026-10-16T06:20:54.715Z
---
# Fix code to match the Model: Il pannello non torna a Get Started quando la cartella perde .trama

## What happens

Il pannello tiene in `this.project` il progetto trovato quando è stato aperto, e `projectNow()` lo riusa finché il pannello è aperto. Se `.trama` viene cancellato, `refresh()` manda `present: true`: il pannello resta sul Diagramma, con l'errore di lettura, e non torna a Get Started.

## What should happen

Quando la cartella non è più un progetto Trama, il pannello torna a Get Started (panel/Open → Get Started su workspace.MODEL_CHANGED: «la cartella di Trama è stata cancellata»).

## Chosen option

**Ricalcolare il progetto a ogni quadro**

Far leggere a `projectNow()` `findProject()` a ogni quadro, senza tenere il progetto trovato; così la scomparsa di .trama manda `present: false` e il pannello passa a Get Started.

## Where in the code

extension/src/host/controller.ts:332-334 (projectNow) e :303 (create)
