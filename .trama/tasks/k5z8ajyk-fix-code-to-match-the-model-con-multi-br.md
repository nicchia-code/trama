---
column: done
technical: false
refs:
  - proposal/Draft
  - requirements/rules#proposal
  - requirements/rules#proposal/In worktree
drift: qpn7dzaw
proposal: null
agent: false
created: 2026-10-06T20:47:58.490Z
finished: 2026-10-06T20:51:56.662Z
---
# Fix code to match the Model: Con multi-branch acceso e senza editor, approvare una Proposal da riga di comando non dice il vero motivo del rifiuto

## What happens

Con l'interruttore multi-branch acceso, `trama proposal approve` manda **ogni** Proposal all'editor e, se nessun editor risponde, rifiuta sempre con «The editor is not available, so a worktree cannot be started.».

- Una **Draft** non è rifiutata dicendo che è ancora in scrittura.
- Un **import** non è rifiutato dicendo che gli import non si accettano con multi-branch acceso.

Il developer legge un motivo che non c'entra: aprire l'editor e riprovare porterebbe comunque a un rifiuto. Con l'editor aperto, invece, i motivi sono quelli giusti.

## What should happen

Approvare una Draft è rifiutato **dicendo che la Proposal è ancora in scrittura**, comunque si provi ad approvarla (`proposal/Draft`, `requirements/rules#proposal`).

Con l'interruttore acceso, la riga di comando segue la strada del pannello **con gli stessi rifiuti**: una Proposal import è rifiutata dicendo il motivo (`requirements/rules#proposal/In worktree`, `requirements/rules#multi-branch`). Il motivo detto deve essere quello vero, non la mancanza dell'editor.

## Chosen option

**Controllare le Proposal prima di cercare l'editor**

Prima di passare la richiesta all'editor, la riga di comando rifiuta da sola ciò che si sa già senza editor: una Draft (ancora in scrittura), una Proposal non aperta, già in un worktree o import, con lo stesso testo del pannello. Solo una Proposal ordinaria e aperta va all'editor. Costo: piccolo, riusa il controllo di approvabilità già esistente; nessun cambiamento con l'editor aperto.

## Where in the code

`src/cli/commands.ts` (comando `proposal approve`, ramo worktree che chiama `writeApproveRequest`/`waitApproveResult`); i controlli giusti sono in `acceptIntoWorktree` (`src/core/worktree-round.ts`), raggiunto solo dall'editor.
