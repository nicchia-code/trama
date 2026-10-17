---
column: done
technical: false
refs:
  - panel/Board
drift: 1k9oxg8h
proposal: null
agent: false
created: 2026-10-17T13:11:41.944Z
finished: 2026-10-17T13:54:12.858Z
---
# Fix code to match the Model: Righe dei Task sotto il Drift in risoluzione non rientrate

## What happens

Nella scheda gialla di una risoluzione, sotto la riga di ogni Drift, le righe dei Task che quel Drift blocca stanno allineate alla riga del Drift stessa, senza alcun rientro: non si vede a colpo d'occhio che dipendono da quel Drift.

## What should happen

Il Requisito chiede che, sotto la riga di ogni Drift, le righe dei Task bloccati siano **rientrate**, come dentro la scheda rossa. Non c'è nessun motivo tecnico che lo impedisca.

## Chosen option

**Rientrare le righe dei Task**

Le righe dei Task bloccati si spostano a destra della riga del Drift con un rientro fisso, senza cambiare testo, ordine o contenuto. Costo: una regola di stile e una verifica visiva sulla Board; nessuna modifica dei dati né della struttura.

## Where in the code

extension/src/webview/resolves.ts (renderResolves: la riga di ogni Drift e le righe dei Task che aggiunge dopo il collegamento); extension/src/webview/board/board.css (regole di .board-resolves e .board-resolves-item, che non esistono)
