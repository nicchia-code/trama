---
column: done
technical: false
refs:
  - proposal/In worktree
  - requirements/rules#proposal/In worktree
  - requirements/rules#proposal
drift: 425depee
proposal: null
agent: false
created: 2026-10-05T14:36:33.982Z
---
# Fix code to match the Model: A Proposal in a worktree can still be edited and goes back to Draft inside the round

## What happens

Mentre una Proposal è **In worktree**, l'agente può ancora registrare, riscrivere o segnare per l'eliminazione uno dei suoi file. La Proposal torna Draft ma resta nel giro, e da Draft il developer può perfino scartarla mentre il suo worktree esiste.

Quando il giro si unisce, i suoi file arrivano comunque nella cartella aperta, ma la Proposal non diventa Approved: resta Draft, oppure Discarded se era stata scartata.

## What should happen

Da **In worktree** una Proposal esce solo togliendola dal giro, perdendo il worktree o abbandonando il giro (torna Open), oppure con l'unione (diventa Approved). Non c'è nessuna transizione per una modifica dell'agente né per lo scarto: per i Requisiti si modificano solo le Draft e le Proposal aperte, e una Proposal nel worktree non è più tra quelle da decidere. La modifica va rifiutata dicendo che la Proposal è in un worktree.

## Chosen option

**Rifiutare la modifica mentre è in un worktree**

Registrare, riscrivere o segnare per l'eliminazione un file di una Proposal che è in un worktree viene rifiutato, con un messaggio che dice che è in un worktree e che va prima tolta dal giro. La Proposal resta nel giro e diventa Approved all'unione. Modifica piccola, il Modello non cambia.

## Where in the code

`src/core/proposals.ts`: `editInProposal`, `deleteInProposal` e `discardProposal` non controllano se la Proposal è in un worktree (lo fanno solo approvazione e rifiuto); `recordMergedProposal` ignora una Proposal non aperta. `src/core/worktree-merge.ts`: `landReadyMerge`.
