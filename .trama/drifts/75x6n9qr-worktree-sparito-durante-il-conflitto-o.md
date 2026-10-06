---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Conflict
  - worktree-round/Reconciling
  - requirements/quality#worktree-round
proposal: g2mkwea6
task: nux9kk3w
origin: null
option: 1
note: null
created: 2026-10-06T14:24:09.548Z
---
# Worktree sparito durante il conflitto o la riconciliazione: il Model non lo prevede

## What happens

Mentre il giro è **in conflitto** o **in riconciliazione**, se sparisce il worktree di una Proposal il cui lavoro non è ancora nell'unione, Trama la toglie dal giro: la Proposal torna in To decide, il developer è avvisato e l'unione che si riprova non la include. Se il suo lavoro è già nell'unione, non succede nulla.

## What should happen

Il Diagram ha `workspace.WORKTREE_LOST` solo da **In progress**: in Conflict e in Reconciling quell'evento non porta da nessuna parte. La Requirement quality#worktree-round, invece, chiede proprio che un worktree sparito prima dell'unione rimandi la sua Proposal a decidere e avvisi il developer, mentre le altre continuano.

## Fix options

### Accettare la Proposal allegata

Aggiunge al Diagram di worktree-round due Transitions su `workspace.WORKTREE_LOST`, da Conflict e da Reconciling, che restano nello stesso State, come fa già il codice. Nessuna modifica al codice e nessuna Requirement nuova: quality#worktree-round copre già il caso. Costa solo la revisione della Proposal.

### Ignorare il worktree sparito fino all'unione

Il Model resta com'è e il codice smette di reagire in Conflict e in Reconciling: la Proposal resta nel giro finché l'unione non si riprova o il giro non viene abbandonato. Serve una correzione del codice e si va contro quality#worktree-round, che vuole l'avviso subito.

## Where in the code

src/core/worktree-round.ts (reconcileLostWorktrees, worktreeProposalIds, mergedProposalIds); extension/src/host/main.ts (watchLostWorktrees); src/core/worktree-merge.ts (finishReconciliation)
