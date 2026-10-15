---
status: resolved
resolution: fix-code
refs:
  - drift/Code to be fixed/task.CLOSED_UNCHANGED
  - drift/Code to be fixed
proposal: null
task: o8pd4tli
origin: null
critical: false
option: 1
note: null
resolvedBy: a46tgzxd
created: 2026-10-14T14:40:28.101Z
---
# Closing a Task that is not the fix Task dismisses the Drift

## What happens

Qualsiasi Task che nomina il Drift in Code to be fixed può essere chiuso senza modifiche, anche se non è il Task di correzione registrato nel Drift. Così il Drift passa a dismesso con la nota di un Task che non ha corretto nulla, mentre il Task di correzione vero resta aperto.

## What should happen

Il Drift passa a dismesso solo quando il suo Task di correzione, quello registrato nel Drift, è chiuso senza modifiche. Un altro Task che lo nomina non deve cambiarne la risoluzione, e il Drift resta in Code to be fixed finché il Task di correzione non è chiuso così.

## Fix options

### Accept the closure only from the registered fix Task

Il Drift passa a dismesso solo se a chiuderlo senza modifiche è il Task di correzione registrato nel Drift. Un altro Task che lo nomina riceve un rifiuto che dice quale Task deve chiuderlo, e il Drift resta in Code to be fixed. Costo: un Task aggiunto a mano per il Drift non può chiuderlo così, e la chiusura passa sempre dal Task di correzione.

### Refuse a second Task for a Drift in Code to be fixed

Il Drift in Code to be fixed ha già il suo Task di correzione, quindi creare un altro Task che lo nomina viene rifiutato, con la spiegazione che il Drift è già in correzione. Nessun Task extra può così chiudere il Drift. Costo: il lavoro a mano sul Drift deve passare dal Task di correzione registrato, e il controllo va anche nel comando che crea i Task.

## Where in the code

File src/core/work.ts: la funzione unchangedDrift controlla che il Drift sia in Code to be fixed, ma non che sia il Task registrato nel suo campo task; la funzione moveTask poi porta il Drift a dismesso. Il comando da riga è trama task move con l'opzione --unchanged, in src/cli/commands.ts.
