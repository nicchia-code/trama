---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
proposal: null
task: j3qjs29r
origin: null
previous: dv33jk9u
critical: false
option: 1
note: null
resolvedBy: mr3hs0l5
created: 2026-10-17T06:47:43.734Z
---
# Delega dei Drift in due impostazioni invece che in una

## What happens

La delega dei Drift si sceglie con due caselle separate, una per i Drift non critici e una per i critici, e non con un'unica scelta a tre livelli.

## What should happen

Il Model e i Requisiti chiedono un'unica scelta della delega dei Drift a tre livelli: disattivata, solo non critici, anche critici.

## Fix options

### Aggiornare il Model e i Requisiti alle due caselle

Le due caselle restano come sono nel codice e nelle impostazioni dell'editor. Il Model e i Requisiti descrivono oggi una sola scelta a tre livelli: si riscrivono le parti che dicono una sola scelta, descrivendo i tre livelli come combinazione delle due caselle.

### Riportare la delega a una sola scelta a tre livelli

La delega torna a un'unica impostazione con i livelli disattivato, solo non critici e anche critici, come chiedono il Model e i Requisiti. Il codice che oggi legge le due caselle e il loro menu si cambia di conseguenza, mantenendo la conferma per alzare la delega.

## Where in the code

extension/package.json:116-127; extension/src/host/settings-schema.ts:60-62
