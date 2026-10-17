---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: mih08a2g
origin: null
critical: false
option: 1
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T12:02:33.345Z
---
# Badge Resolving con nome accessibile diverso dal Requisito

## What happens

Il badge `Resolving` ha tooltip `An agent is resolving this Drift`, ma il nome accessibile è `Resolving: an agent is resolving this Drift`.

## What should happen

Il Requisito di panel/Board chiede tooltip e nome accessibile entrambi `An agent is resolving this Drift`.

## Fix options

### Allineare il nome accessibile

Impostare `aria-label` del badge a `An agent is resolving this Drift`, come il tooltip.

### Aggiornare il Requisito

Accettare il nome con il prefisso `Resolving:` e cambiare il Requisito in `ui/board.md`.

## Where in the code

extension/src/webview/board/render.ts:186-187
