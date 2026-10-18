---
status: resolved
resolution: fix-code
refs:
  - proposal
  - requirements/tech#proposal
proposal: null
task: wixyoyy6
origin: null
critical: false
option: 1
note: null
resolvedBy: 1m17rrz3
created: 2026-10-18T06:17:24.998Z
---
# Drift citato prima del lock

## What happens

Quando una risoluzione registra la decisione su un Drift citato con il suo numero breve, per esempio D3, il comando legge i file di tutte le Proposal, dei Task e dei Drift per trovare quel numero, e solo dopo prende il lock della Proposal che sta scrivendo. Così i file della Proposal vengono letti prima che il lock sia preso.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock, anche quando il comando cita un numero breve. Il numero si cerca solo dopo, dentro il lock, oppure nella tabella già salvata.

## Fix options

### Cercare il Drift dopo il lock

Il comando prende prima il lock della Proposal e cerca il Drift citato solo dentro il lock, insieme alla Proposal. Nessun file della Proposal viene letto prima del lock, e per il developer non cambia nulla: un numero che non esiste resta un errore che non scrive niente. Costo: un solo spostamento dell'ordine delle letture nel comando, senza nuove regole.

### Drift dalla tabella salvata

Il numero di un Drift si cerca solo nella tabella dei numeri salvata, come già accade per la Proposal. Un Drift che la tabella non conosce va citato per identità o per nome, e il comando lo dice senza leggere nessun file. Costo: dopo un pull o con un Drift nato in un'altra copia di lavoro serve un passo in più per citarlo con il numero; il messaggio dice come fare.

## Where in the code

src/cli/commands.ts, comando proposal resolve-drift: il Drift è cercato con il suo argomento prima di withProposalLock. src/core/short-numbers.ts, syncShortNumbers: legge il file di ogni Proposal per assegnare i numeri brevi.
