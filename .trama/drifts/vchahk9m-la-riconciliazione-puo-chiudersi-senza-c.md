---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Reconciling
  - worktree-round/Waiting
proposal: null
task: 18u4yk81
origin: null
option: 1
note: null
created: 2026-10-06T14:40:04.371Z
---
# La riconciliazione può chiudersi senza che il comando dell'agente finisca

## What happens

Mentre il giro è in **Reconciling**, il controllo che applica un'unione in attesa (gira ogni pochi secondi e a ogni cambio del repository) tratta il worktree di merge come pronto appena il Task di riconciliazione è in Done e l'agente ha già concluso da sé il commit dell'unione.

- Il giro si chiude **prima che il comando dell'agente finisca**, senza controllare i marcatori rimasti.
- Le Proposal i cui branch non erano ancora stati uniti restano con il loro worktree, ma il giro non ricorda più branch e commit di partenza: la loro unione successiva viene rifiutata.

## What should happen

Da **Reconciling** si esce verso Merging solo con `terminal.COMMAND_ENDED` e il Task in Done: Trama committa il resto senza Merge Drift e Task, e riprova l'unione di **tutti** i branch rimasti del giro. Solo un'unione davvero in attesa (stato Waiting, nessun Merge Drift aperto) si applica quando la cartella torna pronta. L'altra uscita è l'abbandono del giro.

## Fix options

### Applicare in automatico solo l'unione in attesa

Il controllo periodico applica il risultato solo quando il giro è davvero in Waiting: nessun Merge Drift e nessun Task di riconciliazione nel worktree di merge. La riconciliazione prosegue solo alla fine del comando dell'agente, che riprova anche i branch rimasti. Modifica piccola, nessun cambio al Model.

### Ripartire dall'unione dei branch rimasti

Se il controllo trova la riconciliazione già committata, non applica subito: unisce prima i branch del giro non ancora uniti e verifica i marcatori, come farebbe la fine del comando. Il giro può chiudersi prima che l'agente esca; serve aggiungere al Model questa uscita da Reconciling.

### Impedire all'agente di concludere il commit

Il Task di riconciliazione dice esplicitamente di non committare, e Trama rifiuta un'unione conclusa da altri finché il comando non è finito. Lascia invariato il Diagram, ma dipende dal comportamento dell'agente ed è più fragile.

## Where in the code

src/core/worktree-merge.ts (`applyWaitingMerge`, `conflictOpen`, `landReadyMerge`); extension/src/host/main.ts (`watchReadyRound`)
