---
status: resolved
resolution: fix-code
refs:
  - panel/Open
proposal: null
task: kpqj067f
origin: null
critical: false
option: 1
note: null
resolvedBy: f3ze3dmu
created: 2026-10-16T05:54:19.015Z
---
# Il pannello non torna a Get Started quando la cartella perde .trama

## What happens

Il pannello tiene in `this.project` il progetto trovato quando è stato aperto, e `projectNow()` lo riusa finché il pannello è aperto. Se `.trama` viene cancellato, `refresh()` manda `present: true`: il pannello resta sul Diagramma, con l'errore di lettura, e non torna a Get Started.

## What should happen

Quando la cartella non è più un progetto Trama, il pannello torna a Get Started (panel/Open → Get Started su workspace.MODEL_CHANGED: «la cartella di Trama è stata cancellata»).

## Fix options

### Ricalcolare il progetto a ogni quadro

Far leggere a `projectNow()` `findProject()` a ogni quadro, senza tenere il progetto trovato; così la scomparsa di .trama manda `present: false` e il pannello passa a Get Started.

### Azzerare il progetto memorizzato alla sua scomparsa

In `refresh()`, quando un progetto memorizzato non si trova più con `findProject()`, azzerare `this.project` e mandare `present: false`.

## Where in the code

extension/src/host/controller.ts:332-334 (projectNow) e :303 (create)
