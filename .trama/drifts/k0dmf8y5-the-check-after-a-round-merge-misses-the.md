---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Merging/worktree-round.MERGE_CLEAN
  - worktree-round/Waiting/workspace.TREE_READY
  - requirements/rules#worktree-round
proposal: null
task: 2di5r0uk
origin: null
option: 1
note: null
created: 2026-10-05T14:31:38.533Z
---
# The check after a round merge misses the Features touched only through Requirements

## What happens

Le Feature da controllare dopo l'unione vengono calcolate **dopo** che l'unione è già stata applicata alla cartella aperta. A quel punto i Requisiti della cartella sono già quelli delle Proposal, quindi le Feature toccate solo da sezioni dei Requisiti (o tutte, per un cambio a General o alla descrizione di un'Area) non risultano più. Una Proposal che cambia solo Requisiti non fa partire nessun controllo, le altre lo fanno partire su meno Feature.

## What should happen

Il controllo dopo un'unione riuscita scansiona, in una volta sola e senza doppioni, le Feature che ciascuna Proposal unita avrebbe fatto scansionare da sola con la regola usata dopo un'accettazione, **comprese quelle toccate dai Requisiti**.

## Fix options

### Calcolare le Feature prima di applicare l'unione

Le Feature di ogni Proposal del giro si calcolano prima di applicare l'unione alla cartella aperta e si usano dopo. Riusa la stessa regola dell'accettazione, senza ricalcoli diversi.

### Ricordare le Feature quando la Proposal entra nel giro

Le Feature di ogni Proposal si salvano nel file del giro quando entra nel worktree, e si uniscono all'atterraggio. Sopravvive anche a un riavvio dell'editor mentre il giro aspetta la cartella pronta, al costo di un dato in più nel file del giro.

## Where in the code

`src/core/worktree-merge.ts` (`landReadyMerge` unisce il branch e poi chiama `unionFeatures`, che usa `proposalScope` di `src/core/scope.ts` sui file già uniti).
