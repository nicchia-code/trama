---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: 15fiqn9p
origin: null
critical: false
option: 1
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T12:02:34.047Z
---
# Scheda di attesa senza pallino di stato e nome accessibile diverso

## What happens

La scheda di attesa mostra l'intestazione `Waiting for` senza il pallino di stato del Task di correzione, e il suo nome accessibile è `Waiting for T4: <titolo>` con i due punti.

## What should happen

Il Requisito di panel/Board chiede il titolo `Waiting for <numero breve> <titolo>` preceduto dal pallino di stato di quel Task.

## Fix options

### Aggiungere il pallino allo header

Mettere il pallino di stato del Task di correzione in testa alla scheda, e togliere i due punti dal nome accessibile.

### Aggiornare il Requisito

Accettare la scheda senza pallino e cambiare il Requisito in `ui/board.md`.

## Where in the code

extension/src/webview/board/render.ts:370-371
