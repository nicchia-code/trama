---
status: resolved
resolution: fix-code
refs:
  - requirements/data#design-request
proposal: null
task: ckibhle0
origin: nxbplkgj
option: 1
note: null
resolvedBy: n17csuhe
created: 2026-10-10T09:50:49.608Z
---
# Chosen option keeps finished requests that the Requirement drops

## What happens

Dopo un riavvio dell'editor una richiesta consumata o abbandonata non torna inviabile: il suo file non esiste più, quindi Trama non la invia e chiude la scheda ripristinata senza salvare. Il codice però toglie dall'elenco delle richieste inviate ogni richiesta il cui file è sparito, come chiede il requisito, mentre la scelta del Task vuole che quell'elenco le conservi finché la scheda resta aperta.

## What should happen

La scelta fatta per il Task dice che le richieste consumate o abbandonate restano nell'elenco salvato fino alla chiusura della scheda. Il requisito dice che un identificativo il cui file non esiste più è tolto dall'elenco. Le due regole non si possono seguire insieme: la scelta mantiene ciò che il requisito elimina. Il comportamento richiesto dal modello (una richiesta finita non torna mai inviabile) è già garantito dal controllo sul file e dalla chiusura della scheda.

## Fix options

### Togliere la scelta dal Task e tenere il codice com'è

Le richieste il cui file è sparito escono dall'elenco, come dice il requisito. Nessun invio è possibile senza file, e le schede ripristinate vengono chiuse senza salvare: il comportamento voluto dal modello è rispettato. Costo: l'elenco non ricorda più le richieste finite tra un riavvio e l'altro, ma non serve, perché il file manca. Il Task si chiude senza modifiche al codice.

### Conservare le richieste finite nell'elenco come scelto

Le richieste consumate o abbandonate restano nell'elenco salvato finché la scheda è aperta, e l'elenco sopravvive ai riavvii. Il comportamento visibile è lo stesso della prima strada. Costo: il codice viola il requisito che toglie gli identificativi senza file, quindi il requisito va cambiato prima: decisione del developer, non di Trama.

## Where in the code

extension/src/host/design-requests.ts: forgetMissing e finishMissing
