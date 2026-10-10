---
column: done
technical: true
refs:
  - requirements/data#design-request
drift: hyuybv61
proposal: null
agent: false
created: 2026-10-10T10:10:57.475Z
finished: 2026-10-10T10:11:28.592Z
---
# Fix code to match the Requirements: Chosen option keeps finished requests that the Requirement drops

## What happens

Dopo un riavvio dell'editor una richiesta consumata o abbandonata non torna inviabile: il suo file non esiste più, quindi Trama non la invia e chiude la scheda ripristinata senza salvare. Il codice però toglie dall'elenco delle richieste inviate ogni richiesta il cui file è sparito, come chiede il requisito, mentre la scelta del Task vuole che quell'elenco le conservi finché la scheda resta aperta.

## What should happen

La scelta fatta per il Task dice che le richieste consumate o abbandonate restano nell'elenco salvato fino alla chiusura della scheda. Il requisito dice che un identificativo il cui file non esiste più è tolto dall'elenco. Le due regole non si possono seguire insieme: la scelta mantiene ciò che il requisito elimina. Il comportamento richiesto dal modello (una richiesta finita non torna mai inviabile) è già garantito dal controllo sul file e dalla chiusura della scheda.

## Chosen option

**Togliere la scelta dal Task e tenere il codice com'è**

Le richieste il cui file è sparito escono dall'elenco, come dice il requisito. Nessun invio è possibile senza file, e le schede ripristinate vengono chiuse senza salvare: il comportamento voluto dal modello è rispettato. Costo: l'elenco non ricorda più le richieste finite tra un riavvio e l'altro, ma non serve, perché il file manca. Il Task si chiude senza modifiche al codice.

## Where in the code

extension/src/host/design-requests.ts: forgetMissing e finishMissing
