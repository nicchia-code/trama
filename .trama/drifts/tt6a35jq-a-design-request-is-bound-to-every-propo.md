---
status: resolved
resolution: fix-code
refs:
  - design-request
  - requirements/rules#design-request
proposal: null
task: xxn6dt52
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:19:39.079Z
---
# A design request is bound to every Proposal given its id, not only the first

## What happens

Ogni Proposal creata con il riferimento di una richiesta esistente le resta legata, anche quando una Proposal precedente è già legata alla stessa richiesta. Se la seconda viene consegnata per prima, la richiesta è consumata e il suo file cancellato mentre la prima Proposal è ancora in scrittura.

## What should happen

Solo la prima Proposal aperta dall'agente per una richiesta è legata a essa. Le Proposal successive, anche quando passano per dipendenze, non sono legate, e la richiesta non è consumata da loro.

## Fix options

### Legare solo la prima Proposal

La creazione controlla se la richiesta è già legata a un'altra Proposal e, in quel caso, non la lega, dicendolo nel risultato. Costa un controllo in più alla creazione e una regola che l'agente deve capire dal risultato.

### Lasciare il vincolo all'agente

Il codice non cambia: la skill passa il riferimento solo alla prima Proposal. Costa che la regola del Requisito resta affidata alla disciplina dell'agente e non è verificata dal programma.

### Cambiare il Requisito

Si ammette che più Proposal siano legate alla stessa richiesta, e la consegna della prima consuma la richiesta. Costa una riscrittura del Requisito e una decisione dello sviluppatore sul comportamento atteso.

## Where in the code

src/core/proposals.ts (newProposal, submitProposal); src/cli/commands.ts (proposal new --request)
