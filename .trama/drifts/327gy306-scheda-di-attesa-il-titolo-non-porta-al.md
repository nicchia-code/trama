---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel/Board
  - panel/Board
proposal: null
task: 0fqtbs8s
origin: null
critical: false
option: 1
note: null
resolvedBy: 7pbe7l7n
created: 2026-10-17T12:17:40.543Z
---
# Scheda di attesa: il titolo non porta al Task di correzione

## What happens

La scheda di attesa in Blocked mostra il titolo del Task di correzione come semplice testo. Cliccandolo non succede nulla: per trovare quel Task in Active il developer deve cercarlo a mano nella colonna.

## What should happen

Il Requisito chiede che il titolo della scheda di attesa porti alla scheda del Task di correzione in Active. La scheda non ha altri pulsanti, quindi il titolo è il modo previsto di andare lì.

## Fix options

### Rendere il titolo un collegamento al Task

Il titolo della scheda di attesa diventa un collegamento che, cliccato, porta alla scheda del Task di correzione in Active e la mette a fuoco, come fanno già i badge di blocco dei Task. Nessun altro cambiamento. Costo: il titolo diventa un controllo, quindi serve un nome accessibile e un tooltip che dicano dove porta.

### Far portare alla scheda anche l'ID del Task

Il titolo e l'ID del Task di correzione portano entrambi alla sua scheda in Active, con lo stesso comportamento. Costo: due collegamenti per la stessa destinazione nella scheda e un controllo in più da rendere accessibile; il titolo resta il modo principale di andare lì, come chiede il Requisito.

## Where in the code

extension/src/webview/board/render.ts, waitingCard
