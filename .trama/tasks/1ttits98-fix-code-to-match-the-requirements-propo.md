---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: elf8q0wm
proposal: null
agent: false
created: 2026-10-17T21:40:50.175Z
finished: 2026-10-17T21:53:27.162Z
---
# Fix code to match the Requirements: Proposal letta prima del lock

## What happens

Ogni comando che cambia una Proposal (modificare o togliere un suo file, cambiare l'etichetta, registrare la decisione su un Drift di una risoluzione) legge prima tutta la Proposal, con i suoi Task, per capire quale cita, e solo dopo prende il lock su di lei. Con un'identità fatta solo di cifre, anche la ricerca del lock apre il file della Proposal.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock.

## Chosen option

**Cercare la Proposal dai nomi e dalla tabella dei numeri**

Il comando trova la Proposal dal nome della sua cartella, o dal numero breve che la tabella dei numeri già scritta le assegna, e prende il lock prima di aprire il suo file; il file si legge solo dentro il lock. Per il developer non cambia nulla. Costo: la tabella dei numeri va tenuta aggiornata, e una Proposal appena creata si cita per nome finché la tabella non è scritta.

## Where in the code

src/cli/commands.ts: proposalArg, usato prima di withProposalLock in proposal label, proposal edit, proposal delete e proposal resolve-drift. src/core/proposals.ts: withProposalLock, che cerca la cartella con findCard in src/core/store.ts; la lettura del file avviene solo per identità fatte di sole cifre.
