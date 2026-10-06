---
column: done
technical: false
refs:
  - proposal/In worktree/workspace.WORKTREE_LOST
  - proposal/In worktree/worktree-round.MERGED
drift: nuqjwksd
proposal: null
agent: false
created: 2026-10-06T13:54:48.006Z
---
# Fix code to match the Model: Worktree sparito mentre il giro unisce

## What happens

Una volta che il giro ha **cominciato a unire**, la sparizione del worktree di una Proposal non viene trattata:

- il developer **non è avvisato**;
- la Proposal esce dal gruppo In worktree e torna tra quelle da decidere, dove si può accettare o rifiutare;
- se il suo branch era già nell'unione, all'arrivo dell'unione nella cartella aperta viene **approvata** con le altre; se non lo era, resta aperta in silenzio.

## What should happen

Il Modello fa tornare **aperta, con l'avviso**, ogni Proposal il cui worktree sparisce, in qualunque momento del giro, e approva al merge solo le Proposal ancora In worktree. Non dice che cosa succede a una Proposal il cui lavoro è già nell'unione quando la sua cartella sparisce.

## Chosen option

**Il Modello tiene nel giro il lavoro già unito**

Accettare la Proposal allegata: una Proposal il cui branch è già nell'unione resta In worktree anche senza cartella, non si decide e viene approvata al merge; torna aperta con l'avviso solo se il suo branch non è ancora unito. Poi il codice va corretto perché non la mostri da decidere e avvisi nel secondo caso.

## Where in the code

src/core/worktree-round.ts (reconcileLostWorktrees non fa nulla mentre esiste il worktree di merge; mergedProposalIds; worktreeProposalIds e openProposalsAwaitingDecision contano solo le cartelle presenti); src/core/worktree-merge.ts (landReadyMerge)
