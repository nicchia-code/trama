---
column: done
technical: false
refs:
  - worktree-round/Reconciling
  - worktree-round/Conflict/developer.RECONCILE_MERGE
drift: clzkbko9
proposal: null
agent: false
created: 2026-10-06T15:00:13.923Z
finished: 2026-10-06T15:02:03.500Z
---
# Fix code to match the Model: Riconciliazione avviabile una seconda volta mentre il giro è in Reconciling

## What happens

Mentre l'agente di riconciliazione lavora, il Merge Drift resta in To decide con le sue opzioni attive. Se il Task di riconciliazione è già in **Done** ma il comando dell'agente non è ancora finito (o non finirà mai, senza shell integration), scegliere di nuovo un'opzione di fix **elimina quel Task, ne crea uno nuovo e avvia un secondo agente** nel worktree di merge. La fine del primo comando trova poi il nuovo Task non in Done e avvisa che il giro resta fermo. Con il Task non ancora in Done la stessa scelta è invece rifiutata con un errore.

## What should happen

In **Reconciling** il developer può solo abbandonare il giro (`developer.ABANDON_ROUND`); la riconciliazione prosegue soltanto con `terminal.COMMAND_ENDED` del comando dell'agente. `developer.RECONCILE_MERGE` vale solo da **Conflict**, quindi una seconda riconciliazione non deve partire finché esiste il Task di riconciliazione, in Done o no.

## Chosen option

**Rifiutare sempre la riconciliazione in Reconciling**

Una nuova scelta di fix sul Merge Drift è rifiutata finché esiste un Task di riconciliazione, in qualunque colonna, come già avviene col Task non in Done. Costo minimo; senza shell integration il giro, se il comando non finisce mai, si sblocca solo abbandonandolo, come dice il Model.

## Where in the code

src/core/worktree-merge.ts (reconcileMerge, reconciliationOpen); extension/src/host/controller.ts (resolveDrift per il Merge Drift)
