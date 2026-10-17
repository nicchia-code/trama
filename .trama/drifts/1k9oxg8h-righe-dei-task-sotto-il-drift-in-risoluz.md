---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: l6jg9u5s
origin: null
critical: false
option: 1
note: null
resolvedBy: quuym71o
created: 2026-10-17T12:58:11.954Z
---
# Righe dei Task sotto il Drift in risoluzione non rientrate

## What happens

Nella scheda gialla di una risoluzione, sotto la riga di ogni Drift, le righe dei Task che quel Drift blocca stanno allineate alla riga del Drift stessa, senza alcun rientro: non si vede a colpo d'occhio che dipendono da quel Drift.

## What should happen

Il Requisito chiede che, sotto la riga di ogni Drift, le righe dei Task bloccati siano **rientrate**, come dentro la scheda rossa. Non c'è nessun motivo tecnico che lo impedisca.

## Fix options

### Rientrare le righe dei Task

Le righe dei Task bloccati si spostano a destra della riga del Drift con un rientro fisso, senza cambiare testo, ordine o contenuto. Costo: una regola di stile e una verifica visiva sulla Board; nessuna modifica dei dati né della struttura.

### Raccogliere le righe in un elenco annidato

Le righe dei Task bloccati diventano un elenco annidato dentro la riga del Drift, con il suo rientro e la sua chiave di accessibilità. Costo: più struttura da mantenere nella Board e nei test, ma l'elenco resta leggibile da tastiera e dagli strumenti di assistenza.

## Where in the code

extension/src/webview/resolves.ts (renderResolves: la riga di ogni Drift e le righe dei Task che aggiunge dopo il collegamento); extension/src/webview/board/board.css (regole di .board-resolves e .board-resolves-item, che non esistono)
