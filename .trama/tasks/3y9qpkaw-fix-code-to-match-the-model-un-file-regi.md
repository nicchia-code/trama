---
column: done
technical: false
refs:
  - requirements/rules#proposal/Approved
  - proposal/Open/developer.APPROVE_PROPOSAL
drift: zhdry7ii
proposal: null
agent: false
created: 2026-10-06T18:36:10.282Z
finished: 2026-10-06T18:46:25.125Z
---
# Fix code to match the Model: Un file registrato ma non cambiato conta come Feature toccata dalla Proposal

## What happens

Le Feature toccate da una Proposal si calcolano da **ogni file registrato** con la Proposal, anche quando il suo contenuto è rimasto identico. Un file di Machine o una `feature.md` registrati e lasciati com'erano rendono toccata la loro Feature; un file di Actor registrato e invariato rende toccate tutte le Feature che reagiscono ai suoi Event.

Così, dopo l'approvazione, parte la scansione automatica di Feature che la Proposal non cambia, e con multi-branch acceso l'accettazione apre un worktree invece di essere rifiutata perché la Proposal non tocca nessuna Feature.

## What should happen

Solo un file di Machine o una descrizione di Feature **cambiati** toccano la loro Feature, e solo un file di Actor **cambiato** tocca le Feature che reagiscono ai suoi Event. Una Proposal che registra un file senza cambiarlo non tocca, per quel file, nessuna Feature: niente scansione automatica e, con multi-branch acceso, accettazione rifiutata se non tocca altro.

## Chosen option

**Contare solo i file davvero cambiati**

Per il Modello si considerano solo i file il cui contenuto con la Proposal applicata differisce da quello di prima, come già accade per le sezioni dei Requisiti. Cambia solo il calcolo delle Feature toccate; costo piccolo, nessun cambiamento visibile per le Proposal normali.

## Where in the code

src/core/scope.ts (proposalScope passa ad affectedFeatures tutte le chiavi di `base` e di `delete`, senza confrontare il contenuto)
