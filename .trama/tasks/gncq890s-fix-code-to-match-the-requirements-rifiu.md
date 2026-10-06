---
column: done
technical: true
refs:
  - requirements/ui#worktree-round
drift: nx5pudg6
proposal: null
agent: false
created: 2026-10-06T17:41:58.908Z
finished: 2026-10-06T17:46:50.591Z
---
# Fix code to match the Requirements: Rifiuto fuori da un branch: il codice è giusto, mancano i Requisiti

## What happens

Il Task chiede di correggere il **codice**, ma l'opzione scelta dice che il codice resta com'è: con l'interruttore multi-branch acceso, fuori da un branch l'accettazione è già rifiutata con `This folder is not on a branch, so a worktree cannot be created.`, e un test lo verifica. Non c'è nulla da cambiare nel codice.

## What should happen

Secondo l'opzione scelta, il rifiuto deve comparire fra quelli elencati in `requirements/ui#worktree-round`. Oggi **i Requisiti non lo elencano**, e un Task di implementazione non può modificarli: serve una Proposal, che il developer approva.

## Chosen option

**Approvare la Proposal allegata**

La Proposal aggiunge il testo del rifiuto all'elenco dei rifiuti dell'accettazione in `requirements/ui#worktree-round`, senza toccare il Model. Il codice e i suoi test restano come sono. Costo: una revisione di una riga.

## Where in the code

src/core/worktree-round.ts (acceptIntoWorktree); test/worktree-accept.test.ts
