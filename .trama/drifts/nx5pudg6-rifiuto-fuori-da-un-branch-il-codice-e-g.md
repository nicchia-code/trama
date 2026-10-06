---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#worktree-round
proposal: m1pgp29u
task: gncq890s
origin: d40cq2ei
option: 1
note: null
created: 2026-10-06T17:41:19.106Z
---
# Rifiuto fuori da un branch: il codice è giusto, mancano i Requisiti

## What happens

Il Task chiede di correggere il **codice**, ma l'opzione scelta dice che il codice resta com'è: con l'interruttore multi-branch acceso, fuori da un branch l'accettazione è già rifiutata con `This folder is not on a branch, so a worktree cannot be created.`, e un test lo verifica. Non c'è nulla da cambiare nel codice.

## What should happen

Secondo l'opzione scelta, il rifiuto deve comparire fra quelli elencati in `requirements/ui#worktree-round`. Oggi **i Requisiti non lo elencano**, e un Task di implementazione non può modificarli: serve una Proposal, che il developer approva.

## Fix options

### Approvare la Proposal allegata

La Proposal aggiunge il testo del rifiuto all'elenco dei rifiuti dell'accettazione in `requirements/ui#worktree-round`, senza toccare il Model. Il codice e i suoi test restano come sono. Costo: una revisione di una riga.

### Togliere il rifiuto dal codice

L'accettazione fuori da un branch apre il worktree come le altre, così il codice segue i Requisiti di oggi. Il giro però non ha un branch di partenza a cui tornare: l'unione resta in attesa per sempre e si può solo abbandonare il giro.

## Where in the code

src/core/worktree-round.ts (acceptIntoWorktree); test/worktree-accept.test.ts
