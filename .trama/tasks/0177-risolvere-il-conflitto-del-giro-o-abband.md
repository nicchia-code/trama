---
column: done
technical: false
refs:
  - worktree-round/Conflict
  - worktree-round/Conflict/developer.RECONCILE_MERGE
  - worktree-round/Conflict/developer.ABANDON_ROUND
  - worktree-round/Reconciling
  - worktree-round/Reconciling/terminal.COMMAND_ENDED
  - worktree-round/Reconciling/developer.ABANDON_ROUND
  - worktree-round/Waiting/developer.ABANDON_ROUND
  - proposal/In worktree/developer.ABANDON_ROUND
  - requirements/data#worktree-round
  - requirements/rules#worktree-round
  - requirements/ui#worktree-round
drift: null
proposal: "0035"
agent: false
---
# Risolvere il conflitto del giro o abbandonarlo

Se l'unione ha conflitti nasce un Merge Drift per l'intero giro, in To decide. Si sistema, oppure si abbandona il giro. Non si accetta una Proposal.

Fatto quando:
- Il Merge Drift sta nel worktree di merge, non tra i Drift della cartella aperta, e non resta dopo l'unione.
- Si disegna come un Drift. A destra le opzioni `Reconcile keeping every behaviour` (consigliata) e `Reconcile from the conflict markers`, con `Keep this` e sotto `A Task is created to reconcile the conflicts`. A sinistra `Keep this` e sotto `Every Proposal in the round returns to To decide and the worktrees are deleted`.
- Tenere il lato del sistema fa nascere un Technical Task di riconciliazione nel worktree di merge, non legato a una Proposal e non copiato nella cartella aperta dall'unione. Trama avvia lì l'agente col comando dei worktree.
- Se quel Task è in Done quando il comando finisce, Trama committa il resto lasciando fuori il Merge Drift e il Task, e riprova l'unione.
- Se non è in Done, il giro resta fermo, il developer è avvisato e l'unione non si riprova. Si può abbandonare.
- Abbandonare, dal conflitto, dalla riconciliazione o dall'attesa, riporta ogni Proposal da decidere, elimina i worktree, toglie il Merge Drift e non cambia il branch.
- Dal conflitto in poi non si toglie una sola Proposal.
