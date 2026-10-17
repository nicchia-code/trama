---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: hzutkd1w
origin: null
critical: false
option: 1
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T12:02:32.127Z
---
# Testo vuoto della colonna History diverso dal Requisito

## What happens

Con un periodo che non lascia vedere nessuna voce, la colonna History mostra `Nothing in this period`.

## What should happen

Il Requisito di panel/Board chiede che la colonna dica `Nothing done in this period`.

## Fix options

### Allineare il testo al Requisito

Usare `Nothing done in this period` in `EMPTY_HINTS.history`, come scritto nel Requisito.

### Aggiornare il Requisito

Accettare `Nothing in this period` e cambiare il Requisito in `ui/board.md`.

## Where in the code

extension/src/webview/board/logic.ts:35
