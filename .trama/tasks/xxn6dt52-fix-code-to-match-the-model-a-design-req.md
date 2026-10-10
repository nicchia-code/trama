---
column: done
technical: false
refs:
  - design-request
  - requirements/rules#design-request
drift: tt6a35jq
proposal: null
agent: false
created: 2026-10-09T21:50:06.467Z
finished: 2026-10-09T21:52:07.608Z
---
# Fix code to match the Model: A design request is bound to every Proposal given its id, not only the first

## What happens

Ogni Proposal creata con il riferimento di una richiesta esistente le resta legata, anche quando una Proposal precedente è già legata alla stessa richiesta. Se la seconda viene consegnata per prima, la richiesta è consumata e il suo file cancellato mentre la prima Proposal è ancora in scrittura.

## What should happen

Solo la prima Proposal aperta dall'agente per una richiesta è legata a essa. Le Proposal successive, anche quando passano per dipendenze, non sono legate, e la richiesta non è consumata da loro.

## Chosen option

**Legare solo la prima Proposal**

La creazione controlla se la richiesta è già legata a un'altra Proposal e, in quel caso, non la lega, dicendolo nel risultato. Costa un controllo in più alla creazione e una regola che l'agente deve capire dal risultato.

## Where in the code

src/core/proposals.ts (newProposal, submitProposal); src/cli/commands.ts (proposal new --request)
