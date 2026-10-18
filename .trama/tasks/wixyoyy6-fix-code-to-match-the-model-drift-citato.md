---
column: done
technical: false
refs:
  - proposal
  - requirements/tech#proposal
drift: 0ednohho
proposal: null
agent: false
created: 2026-10-18T06:23:58.335Z
finished: 2026-10-18T06:43:11.335Z
---
# Fix code to match the Model: Drift citato prima del lock

## What happens

Quando una risoluzione registra la decisione su un Drift citato con il suo numero breve, per esempio D3, il comando legge i file di tutte le Proposal, dei Task e dei Drift per trovare quel numero, e solo dopo prende il lock della Proposal che sta scrivendo. Così i file della Proposal vengono letti prima che il lock sia preso.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock, anche quando il comando cita un numero breve. Il numero si cerca solo dopo, dentro il lock, oppure nella tabella già salvata.

## Chosen option

**Cercare il Drift dopo il lock**

Il comando prende prima il lock della Proposal e cerca il Drift citato solo dentro il lock, insieme alla Proposal. Nessun file della Proposal viene letto prima del lock, e per il developer non cambia nulla: un numero che non esiste resta un errore che non scrive niente. Costo: un solo spostamento dell'ordine delle letture nel comando, senza nuove regole.

## Where in the code

src/cli/commands.ts, comando proposal resolve-drift: il Drift è cercato con il suo argomento prima di withProposalLock. src/core/short-numbers.ts, syncShortNumbers: legge il file di ogni Proposal per assegnare i numeri brevi.
