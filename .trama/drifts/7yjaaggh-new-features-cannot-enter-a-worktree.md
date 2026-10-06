---
status: resolved
resolution: fix-code
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/In worktree
proposal: null
task: 6v2ygi4f
origin: null
option: 1
note: null
created: 2026-10-06T18:59:02.334Z
---
# Le Feature nuove non possono entrare in un worktree

## What happens

Una Proposal ordinaria che introduce soltanto una **Feature nuova** resta Open quando il multi-branch è acceso: Trama dice che non interessa nessuna Feature, anche se la Feature esisterebbe nel Modello risultante. La stessa selezione può trattare una Feature rimossa come ancora disponibile. La decisione dipende quindi dal Modello precedente anziché da quello che la Proposal produrrebbe.

## What should happen

L’ingresso nel worktree deve essere possibile quando la Proposal interessa almeno una **Feature che esiste dopo la sua applicazione**, incluse le Feature nuove, purché siano soddisfatte tutte le altre condizioni. Una Feature eliminata non deve invece permettere da sola di avviare il worktree.

## Fix options

### Usare il Modello risultante

Verificare le Feature interessate nel Modello con la Proposal applicata prima di decidere se aprire il worktree. Include le Feature nuove ed esclude quelle rimosse, senza cambiare le altre condizioni di accettazione. Richiede che la verifica preliminare usi lo stesso risultato già controllato per la validità della Proposal.

### Usare direttamente le Feature interessate

Usare per l’accettazione l’elenco delle Feature interessate già limitato a quelle presenti dopo la Proposal, senza una seconda selezione sul Modello precedente. La regola resta la stessa e la decisione non dipende da una Feature già esistente; occorre mantenere quell’elenco coerente anche per gli altri modi di approvare.

## Where in the code

src/core/worktree-round.ts, acceptIntoWorktree; src/core/scope.ts, proposalScope and affectedFeatures
