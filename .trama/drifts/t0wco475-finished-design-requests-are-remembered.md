---
status: open
resolution: null
refs:
  - design-request/Abandoned
  - design-request/Consumed
  - requirements/data#design-request
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: null
created: 2026-10-10T10:53:16.939Z
---
# Finished design requests are remembered in workspace state while their tab is open

## What happens

Quando una richiesta viene consumata o abbandonata mentre una sua scheda è aperta, Trama ne scrive l'ID in un **secondo elenco salvato** nello stato dell'area di lavoro, che sopravvive ai riavvii, e ve lo tiene finché una scheda la mostra. Allo stesso modo l'ID di una richiesta inviata il cui file è sparito resta nell'elenco degli inviati finché la scheda è aperta.

Se il developer salva a mano quella scheda e il file torna in `requests/`, la richiesta resta finita anche dopo un riavvio: niente salvataggio automatico, niente Send to agent, chiudere non invia.

## What should happen

Il Model dice che di una richiesta Abandoned **Trama non tiene traccia** e che una Consumed non esiste più.

Il Requisito dei dati dice che nello stato dell'area di lavoro sta solo l'elenco degli ID inviati, che un ID il cui file non esiste più è tolto, e che un file in `requests/` non elencato è una richiesta in Writing.

I Drift risolti `j4eehkfp`, `hyuybv61` e `5ednksns` hanno già scelto di dedurre la fine della richiesta dal file, senza ricordare le richieste finite tra un riavvio e l'altro.

## Fix options

### Dedurre la fine dal file, senza elenco salvato

Si toglie il secondo elenco salvato: le richieste finite si ricordano solo in memoria per la sessione, e l'ID inviato di un file sparito esce subito dall'elenco, come dice il Requisito. È la scelta già fatta nei Drift risolti. Costo: dopo un riavvio, un file salvato a mano da una scheda rimasta aperta torna una richiesta in Writing e si può inviare.

### Cambiare Model e Requisiti per ammettere l'elenco

Il developer apre una Proposal che dice che Trama ricorda le richieste consumate o abbandonate finché una scheda le mostra, anche tra un riavvio e l'altro, e corregge il Requisito dei dati sull'elenco. Il codice resta com'è. Costo: una regola e uno stato in più da mantenere, e una decisione che rovescia tre Drift già risolti.

### Non ricordare nulla, nemmeno nella sessione

Né elenco salvato né memoria di sessione: conta solo il file. Un file che torna in `requests/` e non è fra gli inviati è una richiesta in Writing, alla lettera del Requisito. Costo: una richiesta consumata la cui scheda con modifiche viene salvata a mano torna inviabile già nella stessa sessione, e chiuderla la invia di nuovo.

## Where in the code

extension/src/host/design-requests.ts: FINISHED_KEY, finish, unfinish, forget, isDone
