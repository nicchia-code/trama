---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#voce-history
proposal: null
task: u5n144hu
origin: null
critical: false
option: 1
note: null
resolvedBy: vh3j3u8i
created: 2026-10-18T07:29:33.005Z
---
# Layout della finestra della voce

## What happens

La finestra di una voce mette titolo, data e pulsante Close su un'unica riga di intestazione: la data sta accanto al titolo, non sotto. Nella lista dei Task della finestra, il tag della Proposal compare prima del titolo del Task.

## What should happen

Il Requisito vuole che la finestra abbia come titolo il **titolo** della voce, con sotto la **data completa**, poi il testo. Nella lista dei Task l'ordine è: pallino di stato, ID, **titolo**, tag della Proposal, data di fine e riferimenti.

## Fix options

### Titolo e data su righe separate

La data va sulla riga sotto il titolo, come chiede il Requisito, e il pulsante Close resta accanto al titolo. Nella lista dei Task il titolo del Task viene prima del tag della Proposal. Costo: l'intestazione della finestra occupa una riga in più; il comportamento della finestra non cambia.

### Titolo e data impilati, Close in fondo

Titolo e data stanno uno sotto l'altro come nella prima opzione, e il pulsante Close si sposta in fondo alla finestra, dopo il testo e i Task. Nella lista dei Task l'ordine è lo stesso. Costo: con un testo lungo il pulsante va cercato in fondo alla finestra che scorre, non più accanto al titolo.

## Where in the code

extension/src/webview/board/history-entry.ts: la funzione che disegna il contenuto della finestra (fill) mette titolo, data e Close nella stessa riga di intestazione; la funzione che disegna ogni Task (taskLine) aggiunge il tag della Proposal prima del titolo. extension/src/webview/board/board.css: la regola board-history-dialog-head dispone l'intestazione su una sola riga.
