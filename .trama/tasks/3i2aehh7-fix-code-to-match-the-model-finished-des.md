---
column: done
technical: false
refs:
  - design-request/Abandoned
  - design-request/Consumed
  - requirements/data#design-request
drift: t0wco475
proposal: null
agent: false
created: 2026-10-10T11:14:40.593Z
finished: 2026-10-10T11:17:20.076Z
---
# Fix code to match the Model: Finished design requests are remembered in workspace state while their tab is open

## What happens

Quando una richiesta viene consumata o abbandonata mentre una sua scheda è aperta, Trama ne scrive l'ID in un **secondo elenco salvato** nello stato dell'area di lavoro, che sopravvive ai riavvii, e ve lo tiene finché una scheda la mostra. Allo stesso modo l'ID di una richiesta inviata il cui file è sparito resta nell'elenco degli inviati finché la scheda è aperta.

Se il developer salva a mano quella scheda e il file torna in `requests/`, la richiesta resta finita anche dopo un riavvio: niente salvataggio automatico, niente Send to agent, chiudere non invia.

## What should happen

Il Model dice che di una richiesta Abandoned **Trama non tiene traccia** e che una Consumed non esiste più.

Il Requisito dei dati dice che nello stato dell'area di lavoro sta solo l'elenco degli ID inviati, che un ID il cui file non esiste più è tolto, e che un file in `requests/` non elencato è una richiesta in Writing.

I Drift risolti `j4eehkfp`, `hyuybv61` e `5ednksns` hanno già scelto di dedurre la fine della richiesta dal file, senza ricordare le richieste finite tra un riavvio e l'altro.

## Chosen option

**Dedurre la fine dal file, senza elenco salvato**

Si toglie il secondo elenco salvato: le richieste finite si ricordano solo in memoria per la sessione, e l'ID inviato di un file sparito esce subito dall'elenco, come dice il Requisito. È la scelta già fatta nei Drift risolti. Costo: dopo un riavvio, un file salvato a mano da una scheda rimasta aperta torna una richiesta in Writing e si può inviare.

## Where in the code

extension/src/host/design-requests.ts: FINISHED_KEY, finish, unfinish, forget, isDone
