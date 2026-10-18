---
status: resolved
resolution: fix-code
refs:
  - voce-history
  - requirements/ui#voce-history
proposal: null
task: r174qdoy
origin: null
critical: false
option: 1
note: null
resolvedBy: uzhgg4na
created: 2026-10-18T07:13:06.355Z
---
# Modale della voce ricostruita

## What happens

Mentre la finestra dei dettagli di una voce è aperta, ogni aggiornamento della Board ne ricostruisce tutto il contenuto: il testo letto torna in cima e il fuoco della tastiera esce dalla finestra, dal pulsante **Close**. Succede a ogni aggiornamento della Board, anche quando la voce non è cambiata.

## What should happen

La finestra resta com'è mentre il developer la legge: il testo lungo conserva la sua posizione di scorrimento e il fuoco resta dentro la finestra, sul pulsante **Close**, finché la finestra è aperta. Il contenuto cambia quando cambia la voce.

## Fix options

### Aggiornare solo ciò che cambia

La finestra si ridisegna solo quando titolo, data, testo o Task della voce cambiano davvero, e lascia intatti scorrimento e fuoco. Costo: un confronto con ciò che la finestra mostra già, un po' più di codice nella scheda della voce.

### Congelare la finestra mentre è aperta

Il contenuto si prende all'apertura e si rinfresca alla riapertura. Costo: se la voce cambia mentre il developer la legge, la finestra mostra il testo di prima finché non la chiude e la riapre.

### Ripristinare scorrimento e fuoco

Dopo ogni ricostruzione la finestra riporta lo scorrimento alla posizione di prima e rimette il fuoco sul pulsante Close. Costo: a ogni aggiornamento il testo si ridisegna e la selezione fatta con il mouse si perde.

## Where in the code

extension/src/webview/board/history-entry.ts: la funzione che disegna il contenuto della finestra (fill) viene chiamata dall'aggiornamento della voce (update) anche quando la finestra è aperta, e sostituisce tutto il corpo della finestra; extension/src/webview/board/index.ts: render chiama update su ogni voce mostrata a ogni quadro della Board.
