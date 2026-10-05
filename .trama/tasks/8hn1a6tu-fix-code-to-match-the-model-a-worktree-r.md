---
column: done
technical: false
refs:
  - worktree-round/In progress/terminal.COMMAND_ENDED
  - requirements/tech#worktree-round
  - requirements/ui#worktree-round
drift: cbm0kp1c
proposal: null
agent: false
created: 2026-10-05T14:38:12.545Z
---
# Fix code to match the Model: A worktree round treats the open folder's Tasks and Drifts copied into the worktree as its own

## What happens

Un worktree nasce dal commit del branch aperto e contiene tutti i Task e i Drift già versionati del progetto. Trama li conta come parte del giro:

- l'unione non parte finché **ogni** Task del worktree è in Done, anche i vecchi Task della cartella aperta: con un solo Task del progetto in To do il giro resta fermo per sempre, senza avvisi;
- la Board mostra di nuovo quei Task e Drift con il badge worktree;
- dopo la decisione su un Drift del worktree l'agente riceve l'istruzione di eseguire tutti i Task in To do, non solo quelli della Proposal.

## What should happen

L'unione parte quando **ogni Task delle Proposal ancora nel giro** è in Done: contano solo i Task legati a quelle Proposal. Sulla Board hanno il badge worktree solo i Task e i Drift nati nel worktree, e il rilancio dopo un Drift esegue i Task rimasti di quella Proposal.

## Chosen option

**Contare solo il lavoro nato per il giro**

Per decidere l'unione contano solo i Task legati a una Proposal del giro; la Board mostra come del worktree solo i Task e i Drift che non esistono nella cartella aperta; il rilancio dopo un Drift esegue i Task di quella Proposal. Rispetta il Modello senza cambiare come nascono i worktree.

## Where in the code

`src/core/worktree-merge.ts` (`mergeRound`, controllo su tutti i Task di ogni worktree); `src/core/snapshot.ts` (Task e Drift dei worktree); `extension/src/host/agent.ts` (`resumeWorktreeTasks` manda l'esecuzione di tutti i Task).
