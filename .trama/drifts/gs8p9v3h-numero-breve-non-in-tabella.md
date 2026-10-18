---
status: resolved
resolution: fix-code
refs:
  - proposal
  - requirements/tech#proposal
proposal: null
task: 8qdyespd
origin: null
previous: cxwcr830
critical: false
option: 1
note: null
resolvedBy: bhjukomq
created: 2026-10-17T22:26:04.569Z
---
# Numero breve non in tabella

## What happens

Quando un comando cita una Proposal con il suo numero breve e il numero non è nella tabella salvata (o la tabella manca), il comando ricalcola tutti i numeri: legge i file di tutte le Proposal vive, dei Task e dei Drift. Lo fa prima di prendere il lock sulla Proposal citata, quindi il file della Proposal viene letto prima del lock nel caso in cui la tabella non basta.

## What should happen

Il lock di una Proposal si prende con la sola identità ricavata dal nome della sua cartella: nessun file della Proposal si legge prima di avere il lock, anche quando il comando cita il numero breve. Il numero si cerca solo nella tabella salvata; una Proposal che la tabella non conosce va citata per identità o per nome, finché un altro comando non l'ha riscritta.

## Fix options

### Rifiutare il numero non in tabella

Quando il numero non c'è nella tabella salvata, il comando si ferma senza scrivere e dice di citare la Proposal per identità o per nome, o di rieseguire un comando che legge le Proposal, così la tabella viene riscritta. Nessun file della Proposal viene letto prima del lock. Costo: dopo un pull o con una Proposal creata in un'altra copia di lavoro, serve un passo in più prima di poterla citare con il numero; il developer lo vede con un messaggio chiaro.

### Aggiornare la tabella a ogni scrittura

Ogni comando che crea, consegna, approva, rifiuta o scarta una scheda riscrive la tabella prima di finire, così il numero di una Proposal appena creata o cambiata è già salvato quando la si cita. Per una Proposal arrivata da un'altra copia di lavoro il numero resta assente, e il comando la rifiuta come nella prima opzione. Costo: una scrittura in più per ogni comando che cambia una scheda, e i comandi da toccare sono molti.

## Where in the code

src/core/short-numbers.ts, savedIdentityOfShortNumber: se la tabella salvata non ha il numero o manca, chiama syncShortNumbers, che legge i file di ogni Proposal, Task e Drift. src/core/proposals.ts, withProposalLock: la ricerca per numero breve avviene prima di withFileLock, e il ripiego fa leggere i file.
