---
column: done
technical: false
refs:
  - requirements/ui#panel/Board
  - panel/Board
drift: 327gy306
proposal: null
agent: false
created: 2026-10-17T12:50:50.718Z
finished: 2026-10-17T13:53:53.630Z
---
# Fix code to match the Model: Scheda di attesa: il titolo non porta al Task di correzione

## What happens

La scheda di attesa in Blocked mostra il titolo del Task di correzione come semplice testo. Cliccandolo non succede nulla: per trovare quel Task in Active il developer deve cercarlo a mano nella colonna.

## What should happen

Il Requisito chiede che il titolo della scheda di attesa porti alla scheda del Task di correzione in Active. La scheda non ha altri pulsanti, quindi il titolo è il modo previsto di andare lì.

## Chosen option

**Rendere il titolo un collegamento al Task**

Il titolo della scheda di attesa diventa un collegamento che, cliccato, porta alla scheda del Task di correzione in Active e la mette a fuoco, come fanno già i badge di blocco dei Task. Nessun altro cambiamento. Costo: il titolo diventa un controllo, quindi serve un nome accessibile e un tooltip che dicano dove porta.

## Where in the code

extension/src/webview/board/render.ts, waitingCard
