---
column: done
technical: false
refs:
  - panel/Settings
drift: 3fipt083
proposal: null
agent: false
created: 2026-10-17T06:54:54.738Z
finished: 2026-10-17T08:45:38.912Z
---
# Fix code to match the Model: Suggerimenti di Copilot con un'etichetta che il Requisito non prevede

## What happens

Per i modelli di Copilot di un vendor diverso da copilot, il suggerimento mostra il nome del modello accanto al valore, che è nome e vendor tra parentesi.

## What should happen

Per Copilot ogni suggerimento ha come valore il nome del modello, con il vendor tra parentesi quando non è copilot, e nessuna etichetta.

## Chosen option

**Tenere l'etichetta e aggiornare il Requisito**

Il nome accanto al valore aiuta a distinguere modelli con lo stesso nome di vendor diversi. Si tiene l'etichetta e si aggiorna il Requisito di Copilot per dirlo, così codice e Requisito coincidono.

## Where in the code

extension/src/host/model-lists.ts:112-113
