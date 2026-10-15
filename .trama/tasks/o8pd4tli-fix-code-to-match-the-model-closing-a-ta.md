---
column: done
technical: false
refs:
  - drift/Code to be fixed/task.CLOSED_UNCHANGED
  - drift/Code to be fixed
drift: xujjy480
proposal: null
agent: false
created: 2026-10-14T16:01:08.875Z
finished: 2026-10-14T16:05:57.995Z
---
# Fix code to match the Model: Closing a Task that is not the fix Task dismisses the Drift

## What happens

Qualsiasi Task che nomina il Drift in Code to be fixed può essere chiuso senza modifiche, anche se non è il Task di correzione registrato nel Drift. Così il Drift passa a dismesso con la nota di un Task che non ha corretto nulla, mentre il Task di correzione vero resta aperto.

## What should happen

Il Drift passa a dismesso solo quando il suo Task di correzione, quello registrato nel Drift, è chiuso senza modifiche. Un altro Task che lo nomina non deve cambiarne la risoluzione, e il Drift resta in Code to be fixed finché il Task di correzione non è chiuso così.

## Chosen option

**Accept the closure only from the registered fix Task**

Il Drift passa a dismesso solo se a chiuderlo senza modifiche è il Task di correzione registrato nel Drift. Un altro Task che lo nomina riceve un rifiuto che dice quale Task deve chiuderlo, e il Drift resta in Code to be fixed. Costo: un Task aggiunto a mano per il Drift non può chiuderlo così, e la chiusura passa sempre dal Task di correzione.

## Where in the code

File src/core/work.ts: la funzione unchangedDrift controlla che il Drift sia in Code to be fixed, ma non che sia il Task registrato nel suo campo task; la funzione moveTask poi porta il Drift a dismesso. Il comando da riga è trama task move con l'opzione --unchanged, in src/cli/commands.ts.
