---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#proposal/Approved
  - proposal/Open/developer.APPROVE_PROPOSAL
proposal: null
task: 3y9qpkaw
origin: null
option: 1
note: null
created: 2026-10-06T18:35:38.210Z
---
# Un file registrato ma non cambiato conta come Feature toccata dalla Proposal

## What happens

Le Feature toccate da una Proposal si calcolano da **ogni file registrato** con la Proposal, anche quando il suo contenuto è rimasto identico. Un file di Machine o una `feature.md` registrati e lasciati com'erano rendono toccata la loro Feature; un file di Actor registrato e invariato rende toccate tutte le Feature che reagiscono ai suoi Event.

Così, dopo l'approvazione, parte la scansione automatica di Feature che la Proposal non cambia, e con multi-branch acceso l'accettazione apre un worktree invece di essere rifiutata perché la Proposal non tocca nessuna Feature.

## What should happen

Solo un file di Machine o una descrizione di Feature **cambiati** toccano la loro Feature, e solo un file di Actor **cambiato** tocca le Feature che reagiscono ai suoi Event. Una Proposal che registra un file senza cambiarlo non tocca, per quel file, nessuna Feature: niente scansione automatica e, con multi-branch acceso, accettazione rifiutata se non tocca altro.

## Fix options

### Contare solo i file davvero cambiati

Per il Modello si considerano solo i file il cui contenuto con la Proposal applicata differisce da quello di prima, come già accade per le sezioni dei Requisiti. Cambia solo il calcolo delle Feature toccate; costo piccolo, nessun cambiamento visibile per le Proposal normali.

### Rifiutare la consegna con file registrati e invariati

La consegna è rifiutata finché la Proposal contiene un file registrato identico all'originale, e l'agente deve toglierlo. Il calcolo resta com'è, ma serve un comando per togliere un file registrato da una Proposal e una nuova regola di consegna nel Modello.

### Accettare il comportamento attuale nei Requisiti

Il Requisito dice che ogni file registrato tocca la sua Feature, cambiato o no. Nessun cambiamento al codice; resta possibile una scansione o un worktree senza nulla da confrontare quando l'agente registra un file e lo lascia com'era.

## Where in the code

src/core/scope.ts (proposalScope passa ad affectedFeatures tutte le chiavi di `base` e di `delete`, senza confrontare il contenuto)
