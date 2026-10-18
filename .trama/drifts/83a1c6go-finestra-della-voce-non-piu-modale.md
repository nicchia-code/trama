---
status: resolved
resolution: fix-code
refs:
  - voce-history/Registrata/agent.VOCE_HISTORY_AGGIORNATA
  - requirements/ui#voce-history
proposal: null
task: jdtjzcek
origin: null
critical: false
option: 1
note: null
resolvedBy: zuzx1g55
created: 2026-10-18T07:57:36.263Z
---
# Finestra della voce non più modale

## What happens

Se la Board si aggiorna mentre la finestra di una voce è aperta e la voce cambia posto nella colonna (per esempio perché l'agente l'ha appena aggiornata e la voce sale in cima, o perché una voce sopra di lei è stata tolta), la finestra resta aperta ma smette di essere modale: lo sfondo torna cliccabile e il focus può uscire dalla finestra.

## What should happen

La finestra di una voce è una finestra modale: finché è aperta resta sopra il pannello, il focus resta dentro e il resto della Board non risponde, anche quando la Board si aggiorna. La voce aggiornata sale in cima alla colonna, ma la sua finestra non cambia modo.

## Fix options

### Riordinare senza spostare la voce

La colonna cambia l'ordine delle voci senza staccare l'elemento della voce aperta dalla pagina (per esempio con la proprietà order), così la finestra non perde il suo stato. La voce aperta sale in cima subito, come le altre. Costa un riordino fatto con l'ordine CSS su tutti gli elementi della colonna, più complesso di quello di adesso.

### Riaprire la finestra dopo lo spostamento

Quando la voce cambia posto con la finestra aperta, la finestra si chiude e si riapre subito come modale, con il focus sul pulsante Close. Il riordino resta com'è. Costa uno sfarfallio e può far perdere la posizione di scorrimento del testo lungo.

### Tenere ferma la voce fino alla chiusura

Mentre la finestra di una voce è aperta, la voce resta nel suo posto e sale in cima alla colonna solo alla chiusura della finestra. La finestra resta modale senza altri cambiamenti. Costa un ritardo nel riordino: la voce aggiornata compare nel posto nuovo solo dopo la chiusura, in contrasto con il fatto che sale in cima subito.

## Where in the code

extension/src/webview/board/index.ts: la funzione reconcile e il punto in cui le voci della colonna History sono rimesse in ordine (historyShown); extension/src/webview/board/history-entry.ts: la finestra della voce, aperta con showModal
