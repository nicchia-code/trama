---
column: done
technical: false
refs:
  - voce-history
  - requirements/ui#voce-history
drift: o8ihx5k0
proposal: null
agent: false
created: 2026-10-18T07:16:58.491Z
finished: 2026-10-18T07:24:39.577Z
---
# Fix code to match the Model: Modale della voce ricostruita

## What happens

Mentre la finestra dei dettagli di una voce è aperta, ogni aggiornamento della Board ne ricostruisce tutto il contenuto: il testo letto torna in cima e il fuoco della tastiera esce dalla finestra, dal pulsante **Close**. Succede a ogni aggiornamento della Board, anche quando la voce non è cambiata.

## What should happen

La finestra resta com'è mentre il developer la legge: il testo lungo conserva la sua posizione di scorrimento e il fuoco resta dentro la finestra, sul pulsante **Close**, finché la finestra è aperta. Il contenuto cambia quando cambia la voce.

## Chosen option

**Aggiornare solo ciò che cambia**

La finestra si ridisegna solo quando titolo, data, testo o Task della voce cambiano davvero, e lascia intatti scorrimento e fuoco. Costo: un confronto con ciò che la finestra mostra già, un po' più di codice nella scheda della voce.

## Where in the code

extension/src/webview/board/history-entry.ts: la funzione che disegna il contenuto della finestra (fill) viene chiamata dall'aggiornamento della voce (update) anche quando la finestra è aperta, e sostituisce tutto il corpo della finestra; extension/src/webview/board/index.ts: render chiama update su ogni voce mostrata a ogni quadro della Board.
