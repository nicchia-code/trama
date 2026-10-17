---
column: done
technical: false
refs:
  - panel/Settings
drift: dm88g5zb
proposal: null
agent: false
created: 2026-10-17T06:54:54.721Z
finished: 2026-10-17T07:34:13.986Z
---
# Fix code to match the Model: Delega dei Drift in due impostazioni invece che in una

## What happens

La delega dei Drift si sceglie con due caselle separate, una per i Drift non critici e una per i critici, e non con un'unica scelta a tre livelli.

## What should happen

Il Model e i Requisiti chiedono un'unica scelta della delega dei Drift a tre livelli: disattivata, solo non critici, anche critici.

## Chosen option

**Aggiornare il Model e i Requisiti alle due caselle**

Le due caselle restano come sono nel codice e nelle impostazioni dell'editor. Il Model e i Requisiti descrivono oggi una sola scelta a tre livelli: si riscrivono le parti che dicono una sola scelta, descrivendo i tre livelli come combinazione delle due caselle.

## Where in the code

extension/package.json:116-127; extension/src/host/settings-schema.ts:60-62
