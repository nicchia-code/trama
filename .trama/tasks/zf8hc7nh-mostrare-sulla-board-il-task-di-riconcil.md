---
column: done
technical: false
refs:
  - worktree-round/Reconciling
  - worktree-round/Conflict/developer.RECONCILE_MERGE
  - requirements/tech#worktree-round
  - requirements/ui#worktree-round
drift: null
proposal: null
agent: false
created: 2026-10-06T18:16:40.529Z
finished: 2026-10-06T18:21:50.839Z
---
# Mostrare sulla Board il Task di riconciliazione del worktree di merge

Quando il developer sceglie di riconciliare il Merge Drift, nasce un Task di riconciliazione nel worktree di merge e l'agente ci lavora. Oggi la Board del progetto aperto legge Task e Drift solo dai worktree delle Proposal, non da quello di merge, quindi questo Task non compare da nessuna parte.

Fatto quando:
- la Board del progetto aperto mostra il Task di riconciliazione mentre il giro è in riconciliazione, con la sua colonna aggiornata mentre l'agente lo sposta;
- la carta ha il badge `worktree` come gli altri Task dei worktree del giro;
- Run all To do e Run this design non lo lanciano, e `trama task next` nella cartella aperta non lo vede;
- quando il Task sparisce (unione riuscita, giro di nuovo in conflitto o abbandonato) sparisce anche dalla Board.
