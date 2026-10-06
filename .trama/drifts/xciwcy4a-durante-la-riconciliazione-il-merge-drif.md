---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Reconciling
  - worktree-round/Reconciling/terminal.COMMAND_ENDED
  - requirements/ui#worktree-round
proposal: null
task: t1l41dzr
origin: null
option: 1
note: null
created: 2026-10-06T18:16:51.637Z
---
# Durante la riconciliazione il Merge Drift resta da decidere in To decide

## What happens

Dopo che il developer ha scelto di riconciliare, il **Merge Drift resta in To decide** con entrambi i lati attivi per tutta la riconciliazione.

- Il lato da tenere per sistemare si può scegliere di nuovo, ma fallisce con un errore perché il giro è già in riconciliazione.
- Il lato da abbandonare è l'unico modo di abbandonare il giro da qui: il pulsante `Abandon round` resta nascosto finché il Merge Drift esiste.

## What should happen

In **Reconciling** il Merge Drift non è da decidere: torna da decidere solo con il passaggio a **Conflict**, quando il Task di riconciliazione è in Done ma restano marcatori di conflitto.

Da Reconciling il developer può solo abbandonare l'intero giro (`developer.ABANDON_ROUND`); scegliere di nuovo la riconciliazione non è una Transizione del Modello.

## Fix options

### Togliere il Merge Drift da To decide durante la riconciliazione

Mentre esiste il Task di riconciliazione la Board non mostra il Merge Drift tra le carte da decidere, e mostra il pulsante `Abandon round` del gruppo In worktree, come nell'attesa. Il Merge Drift ricompare in To decide quando il giro torna in Conflict. Costo: la regola di visibilità del pulsante e del Merge Drift cambia; nessun cambio ai file del giro.

### Mostrare il Merge Drift come non decidibile

Il Merge Drift resta visibile durante la riconciliazione, ma con i lati disattivati e una riga che dice che il giro è in riconciliazione, come i Drift di un worktree quando il giro si unisce; l'abbandono passa dal pulsante `Abandon round`. Costo: la carta resta in To decide pur non essendo da decidere, il che contraddice in parte il Modello.

### Cambiare il Modello

Aggiornare il Modello e i Requisiti perché in Reconciling il Merge Drift resti da decidere, con il solo lato di abbandono valido. Costo: serve una Proposal; il lato di riconciliazione che fallisce resterebbe comunque da spiegare o togliere.

## Where in the code

src/core/snapshot.ts (mergeDriftViews), src/core/worktree-merge.ts (reconcileMerge), extension/src/webview/board/index.ts (visibilità di Abandon round)
