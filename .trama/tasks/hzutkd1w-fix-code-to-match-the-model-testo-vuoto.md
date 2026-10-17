---
column: done
technical: false
refs:
  - panel/Board
drift: p6m78egx
proposal: null
agent: false
created: 2026-10-17T12:11:32.289Z
finished: 2026-10-17T13:52:33.083Z
---
# Fix code to match the Model: Testo vuoto della colonna History diverso dal Requisito

## What happens

Con un periodo che non lascia vedere nessuna voce, la colonna History mostra `Nothing in this period`.

## What should happen

Il Requisito di panel/Board chiede che la colonna dica `Nothing done in this period`.

## Chosen option

**Allineare il testo al Requisito**

Usare `Nothing done in this period` in `EMPTY_HINTS.history`, come scritto nel Requisito.

## Where in the code

extension/src/webview/board/logic.ts:35
