---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: cxwcr830
proposal: null
agent: false
created: 2026-10-17T22:12:56.757Z
finished: 2026-10-17T22:20:27.137Z
---
# Fix code to match the Requirements: Numero breve prima del lock

## What happens

Quando il comando cita una Proposal con il suo numero breve, come P3, per trovare l'identità rilegge i file di tutte le Proposal: ricalcola la tabella dei numeri, che apre il file di ogni Proposal per sapere quali sono ancora vive, e solo dopo prende il lock su quella citata. Il file della Proposal si legge quindi prima del lock. La correzione chiusa da questo Drift ha reso sicuro il caso in cui si cita l'identità o il nome della cartella, non quello del numero breve.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock. Vale anche quando il comando cita la Proposal con il numero breve: il numero si cerca senza aprire i file, e la Proposal si apre solo dentro il lock.

## Chosen option

**Cercare il numero nella tabella salvata**

Il comando legge solo la tabella dei numeri già scritta per trovare l'identità del numero breve, prende il lock su quella e apre la Proposal solo dentro il lock. Se la tabella non corrisponde più alla Proposal trovata, il comando lo dice e non scrive nulla. Costo: una Proposal nuova va citata per identità o per nome finché un altro comando non ha riscritto la tabella, e serve un controllo dopo il lock. Il developer non nota nulla.

## Where in the code

src/core/proposals.ts, withProposalLock: la chiamata a identityOfShortNumber avviene prima di withFileLock. src/core/short-numbers.ts, identityOfShortNumber e syncShortNumbers, che legge il file di ogni Proposal con cardsIn.
