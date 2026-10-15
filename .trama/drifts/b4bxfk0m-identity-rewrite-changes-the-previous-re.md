---
status: resolved
resolution: proposal
refs:
  - requirements/rules#project
  - requirements/data#drift
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: a46tgzxd
created: 2026-10-14T14:41:25.507Z
---
# Identity rewrite changes the previous reference of recurring Drifts

## What happens

La riscrittura delle identità cambia anche il campo `previous` di un Drift ricorrente, quando il Drift precedente è ancora numerato: il riferimento passa alla nuova identità. Il Requisito elenca i campi che la riscrittura cambia e non cita `previous`.

## What should happen

Il Requisito dei Drift dice che `previous` si scrive alla creazione e non cambia più. Il riferimento al Drift precedente però deve seguire la nuova identità, altrimenti il Drift ricorrente punta a un numero che non esiste più.

## Fix options

### Aggiornare i Requisiti

Il comportamento resta com'è: la riscrittura segue anche il Drift precedente. Si scrive nel Requisito delle identità che il campo cambia solo con la riscrittura, e che la riscrittura lo segue. Costo: qualche frase nei Requisiti, nessun cambio di codice.

### Smettere di seguire il precedente

La riscrittura lascia il Drift precedente com'è, come dicono i Requisiti. Il Drift ricorrente punta allora a un numero che non esiste più, e la catena dei Drift ricorrenti si rompe a ogni riscrittura. Costo: un riferimento che non si segue più.

## Where in the code

src/core/rewrite-ids.ts (riscrittura dei campi dei Drift); src/core/work.ts (campo previous)
