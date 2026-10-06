---
column: done
technical: false
refs:
  - worktree-round/Reconciling
  - worktree-round/Reconciling/terminal.COMMAND_ENDED
  - requirements/ui#worktree-round
drift: xciwcy4a
proposal: null
agent: false
created: 2026-10-06T18:17:23.951Z
finished: 2026-10-06T18:23:45.152Z
---
# Fix code to match the Model: Durante la riconciliazione il Merge Drift resta da decidere in To decide

## What happens

Dopo che il developer ha scelto di riconciliare, il **Merge Drift resta in To decide** con entrambi i lati attivi per tutta la riconciliazione.

- Il lato da tenere per sistemare si può scegliere di nuovo, ma fallisce con un errore perché il giro è già in riconciliazione.
- Il lato da abbandonare è l'unico modo di abbandonare il giro da qui: il pulsante `Abandon round` resta nascosto finché il Merge Drift esiste.

## What should happen

In **Reconciling** il Merge Drift non è da decidere: torna da decidere solo con il passaggio a **Conflict**, quando il Task di riconciliazione è in Done ma restano marcatori di conflitto.

Da Reconciling il developer può solo abbandonare l'intero giro (`developer.ABANDON_ROUND`); scegliere di nuovo la riconciliazione non è una Transizione del Modello.

## Chosen option

**Togliere il Merge Drift da To decide durante la riconciliazione**

Mentre esiste il Task di riconciliazione la Board non mostra il Merge Drift tra le carte da decidere, e mostra il pulsante `Abandon round` del gruppo In worktree, come nell'attesa. Il Merge Drift ricompare in To decide quando il giro torna in Conflict. Costo: la regola di visibilità del pulsante e del Merge Drift cambia; nessun cambio ai file del giro.

## Where in the code

src/core/snapshot.ts (mergeDriftViews), src/core/worktree-merge.ts (reconcileMerge), extension/src/webview/board/index.ts (visibilità di Abandon round)
