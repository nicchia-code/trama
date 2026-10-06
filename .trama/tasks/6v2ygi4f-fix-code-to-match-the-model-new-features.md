---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/In worktree
drift: 7yjaaggh
proposal: null
agent: false
created: 2026-10-06T18:59:37.946Z
finished: 2026-10-06T19:30:48.471Z
---
# Fix code to match the Model: New Features cannot enter a worktree

## What happens

Una Proposal ordinaria che introduce soltanto una **Feature nuova** resta Open quando il multi-branch è acceso: Trama dice che non interessa nessuna Feature, anche se la Feature esisterebbe nel Modello risultante. La stessa selezione può trattare una Feature rimossa come ancora disponibile. La decisione dipende quindi dal Modello precedente anziché da quello che la Proposal produrrebbe.

## What should happen

L’ingresso nel worktree deve essere possibile quando la Proposal interessa almeno una **Feature che esiste dopo la sua applicazione**, incluse le Feature nuove, purché siano soddisfatte tutte le altre condizioni. Una Feature eliminata non deve invece permettere da sola di avviare il worktree.

## Chosen option

**Use the resulting Model**

Verificare le Feature interessate nel Modello con la Proposal applicata prima di decidere se aprire il worktree. Include le Feature nuove ed esclude quelle rimosse, senza cambiare le altre condizioni di accettazione. Richiede che la verifica preliminare usi lo stesso risultato già controllato per la validità della Proposal.

## Where in the code

src/core/worktree-round.ts, acceptIntoWorktree; src/core/scope.ts, proposalScope and affectedFeatures
