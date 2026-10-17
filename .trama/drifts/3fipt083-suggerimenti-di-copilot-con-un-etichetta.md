---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
proposal: null
task: snur4167
origin: null
critical: false
option: 2
note: null
resolvedBy: mr3hs0l5
created: 2026-10-17T06:47:44.651Z
---
# Suggerimenti di Copilot con un'etichetta che il Requisito non prevede

## What happens

Per i modelli di Copilot di un vendor diverso da copilot, il suggerimento mostra il nome del modello accanto al valore, che è nome e vendor tra parentesi.

## What should happen

Per Copilot ogni suggerimento ha come valore il nome del modello, con il vendor tra parentesi quando non è copilot, e nessuna etichetta.

## Fix options

### Togliere l'etichetta dai suggerimenti di Copilot

I suggerimenti di Copilot mostrano solo il valore, come chiede il Requisito, così la lista non ripete il nome accanto al valore con il vendor. La ricerca del ruolo non cambia, perché usa il valore.

### Tenere l'etichetta e aggiornare il Requisito

Il nome accanto al valore aiuta a distinguere modelli con lo stesso nome di vendor diversi. Si tiene l'etichetta e si aggiorna il Requisito di Copilot per dirlo, così codice e Requisito coincidono.

## Where in the code

extension/src/host/model-lists.ts:112-113
