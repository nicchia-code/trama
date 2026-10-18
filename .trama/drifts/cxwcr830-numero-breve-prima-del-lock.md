---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#proposal
proposal: null
task: i1giaip3
origin: null
previous: elf8q0wm
critical: false
option: 1
note: null
resolvedBy: g4oabnmj
created: 2026-10-17T21:58:53.251Z
---
# Numero breve prima del lock

## What happens

Quando il comando cita una Proposal con il suo numero breve, come P3, per trovare l'identità rilegge i file di tutte le Proposal: ricalcola la tabella dei numeri, che apre il file di ogni Proposal per sapere quali sono ancora vive, e solo dopo prende il lock su quella citata. Il file della Proposal si legge quindi prima del lock. La correzione chiusa da questo Drift ha reso sicuro il caso in cui si cita l'identità o il nome della cartella, non quello del numero breve.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock. Vale anche quando il comando cita la Proposal con il numero breve: il numero si cerca senza aprire i file, e la Proposal si apre solo dentro il lock.

## Fix options

### Cercare il numero nella tabella salvata

Il comando legge solo la tabella dei numeri già scritta per trovare l'identità del numero breve, prende il lock su quella e apre la Proposal solo dentro il lock. Se la tabella non corrisponde più alla Proposal trovata, il comando lo dice e non scrive nulla. Costo: una Proposal nuova va citata per identità o per nome finché un altro comando non ha riscritto la tabella, e serve un controllo dopo il lock. Il developer non nota nulla.

### Lock comune mentre si cerca il numero

Quando il comando riceve un numero breve, prende prima un lock comune su tutte le Proposal, legge la tabella e i file quanto basta a trovare quella citata, poi prende il suo lock e lascia il comune. Le altre scritture aspettano il tempo di questa lettura, che con poche Proposal è di pochi millisecondi. Costo: un lock in più da mantenere, e due scritture su Proposal diverse che citano numeri non procedono più insieme.

## Where in the code

src/core/proposals.ts, withProposalLock: la chiamata a identityOfShortNumber avviene prima di withFileLock. src/core/short-numbers.ts, identityOfShortNumber e syncShortNumbers, che legge il file di ogni Proposal con cardsIn.
