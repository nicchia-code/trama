---
column: done
technical: true
refs:
  - requirements/ui#voce-history
drift: 4a7stmkz
proposal: null
agent: false
created: 2026-10-18T07:32:49.397Z
finished: 2026-10-18T07:37:31.480Z
---
# Fix code to match the Requirements: Layout della finestra della voce

## What happens

La finestra di una voce mette titolo, data e pulsante Close su un'unica riga di intestazione: la data sta accanto al titolo, non sotto. Nella lista dei Task della finestra, il tag della Proposal compare prima del titolo del Task.

## What should happen

Il Requisito vuole che la finestra abbia come titolo il **titolo** della voce, con sotto la **data completa**, poi il testo. Nella lista dei Task l'ordine è: pallino di stato, ID, **titolo**, tag della Proposal, data di fine e riferimenti.

## Chosen option

**Titolo e data su righe separate**

La data va sulla riga sotto il titolo, come chiede il Requisito, e il pulsante Close resta accanto al titolo. Nella lista dei Task il titolo del Task viene prima del tag della Proposal. Costo: l'intestazione della finestra occupa una riga in più; il comportamento della finestra non cambia.

## Where in the code

extension/src/webview/board/history-entry.ts: la funzione che disegna il contenuto della finestra (fill) mette titolo, data e Close nella stessa riga di intestazione; la funzione che disegna ogni Task (taskLine) aggiunge il tag della Proposal prima del titolo. extension/src/webview/board/board.css: la regola board-history-dialog-head dispone l'intestazione su una sola riga.
