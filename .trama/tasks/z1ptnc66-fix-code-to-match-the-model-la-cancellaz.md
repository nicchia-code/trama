---
column: done
technical: false
refs:
  - requirements/tech#design-request
  - design-request/Sent/workspace.REQUEST_DELETED
  - design-request/Writing/workspace.REQUEST_DELETED
drift: 3n8mwjyc
proposal: null
agent: false
created: 2026-10-06T14:59:57.544Z
finished: 2026-10-06T15:03:29.871Z
---
# Fix code to match the Model: La cancellazione delle richieste usa un osservatore dei file suo, non quello già usato per .trama/

## What happens

L'estensione si accorge che il file di una richiesta di design è sparito (consegna della Proposal legata o cancellazione da fuori) con un **osservatore dei file dedicato** alle richieste, attivo per tutta la vita dell'estensione. Così la scheda si chiude e l'elenco delle richieste inviate si aggiorna anche quando il pannello di Trama è chiuso.

L'osservatore che l'estensione già usa per `.trama/` è quello del pannello, che esiste solo finché il pannello è aperto.

## What should happen

Il Requisito tecnico dice che l'estensione si accorge della cancellazione del file **con l'osservatore dei file che già usa per `.trama/`**, e chiude la scheda solo se non ha modifiche non salvate.

## Chosen option

**Usare l'osservatore del pannello**

La cancellazione passa dall'osservatore di `.trama/` del pannello, come dice il Requisito. Con il pannello chiuso la scheda di una richiesta consumata o cancellata resta aperta e l'elenco delle richieste inviate non si aggiorna fino al riavvio: contraddice le Transizioni verso Consumed e Abandoned, che non dipendono dal pannello.

## Where in the code

extension/src/host/design-requests.ts (watchDeletions); extension/src/host/controller.ts (osservatore creato con il pannello)
