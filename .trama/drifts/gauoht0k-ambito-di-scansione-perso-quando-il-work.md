---
status: resolved
resolution: fix-code
refs:
  - proposal/In worktree/worktree-round.MERGED
  - requirements/data#proposal
proposal: null
task: 3ee8t9t1
origin: null
option: 1
note: null
created: 2026-10-06T16:20:24.589Z
---
# Ambito di scansione perso quando il worktree sparisce dopo l'unione

## What happens

Quando un giro di worktree viene unito, ogni Proposal unita diventa approvata con l'**ambito di scansione** calcolato quando è entrata nel suo worktree, ma Trama lo legge solo dalla cartella di quel worktree.

Se la cartella è sparita dopo che il suo branch era già nell'unione (caso che il Modello prevede esplicitamente), la Proposal diventa approvata **senza ambito di scansione**: `trama proposal show` non ha la sezione `## Scan scope` e il campo `scanScope` manca, come se fosse un import o una Proposal approvata prima che il campo esistesse.

## What should happen

L'ambito di scansione è scritto quando la Proposal ordinaria entra in un worktree e **non cambia più dopo**; manca solo nelle Proposal import, in quelle non ancora approvate e in quelle approvate prima che il campo esistesse.

La transizione verso Approved vale per ogni Proposal il cui branch è nell'unione, **anche se la cartella del suo worktree è sparita**: anche allora deve arrivare approvata con il suo ambito.

## Fix options

### Salvare l'ambito fuori dalla cartella del worktree

Quando la Proposal entra nel worktree, Trama scrive l'ambito anche in un posto che sopravvive alla cartella (per esempio nel file del giro accanto ai worktree, o nella Proposal della cartella aperta senza cambiarne lo stato). All'unione lo legge da lì. Costo contenuto: un dato in più da tenere e da pulire alla fine del giro.

### Ricalcolare l'ambito all'unione quando manca

Se la cartella del worktree non c'è più, Trama ricalcola l'ambito confrontando il Modello e i Requisiti della cartella aperta prima dell'unione con quelli della Proposal applicata. Nessun dato nuovo da salvare, ma l'ambito può differire da quello calcolato all'ingresso se la cartella aperta è cambiata nel frattempo.

## Where in the code

src/core/worktree-merge.ts (`landReadyMerge`, che legge lo scope solo dal `proposal.md` nella cartella del worktree; `commitLeftovers` esclude quel file dal commit); src/core/proposals.ts (`recordMergedProposal`)
