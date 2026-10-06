---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#design-request
  - design-request/Sent/workspace.REQUEST_DELETED
  - design-request/Writing/workspace.REQUEST_DELETED
proposal: null
task: z1ptnc66
origin: null
option: 2
note: null
created: 2026-10-06T14:47:23.848Z
---
# La cancellazione delle richieste usa un osservatore dei file suo, non quello già usato per .trama/

## What happens

L'estensione si accorge che il file di una richiesta di design è sparito (consegna della Proposal legata o cancellazione da fuori) con un **osservatore dei file dedicato** alle richieste, attivo per tutta la vita dell'estensione. Così la scheda si chiude e l'elenco delle richieste inviate si aggiorna anche quando il pannello di Trama è chiuso.

L'osservatore che l'estensione già usa per `.trama/` è quello del pannello, che esiste solo finché il pannello è aperto.

## What should happen

Il Requisito tecnico dice che l'estensione si accorge della cancellazione del file **con l'osservatore dei file che già usa per `.trama/`**, e chiude la scheda solo se non ha modifiche non salvate.

## Fix options

### Correggere il Requisito

Il Requisito dice che la cancellazione si osserva con un osservatore dei file delle richieste attivo finché l'estensione è attiva, indipendente dal pannello. Il codice resta com'è. Costo: una Proposal di una riga sui Requisiti tecnici.

### Usare l'osservatore del pannello

La cancellazione passa dall'osservatore di `.trama/` del pannello, come dice il Requisito. Con il pannello chiuso la scheda di una richiesta consumata o cancellata resta aperta e l'elenco delle richieste inviate non si aggiorna fino al riavvio: contraddice le Transizioni verso Consumed e Abandoned, che non dipendono dal pannello.

### Un solo osservatore di .trama/ per tutta l'estensione

Si crea un osservatore di `.trama/` condiviso, attivo per tutta la vita dell'estensione, che serve sia al pannello sia alle richieste; il Requisito diventa vero alla lettera. Costo: riorganizzare come il pannello riceve i cambiamenti dei file, senza effetti visibili per il developer.

## Where in the code

extension/src/host/design-requests.ts (watchDeletions); extension/src/host/controller.ts (osservatore creato con il pannello)
