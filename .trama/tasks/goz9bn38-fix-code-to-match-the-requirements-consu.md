---
column: done
technical: true
refs:
  - requirements/data#design-request
drift: 5ednksns
proposal: null
agent: false
created: 2026-10-10T10:36:32.796Z
finished: 2026-10-10T10:37:50.266Z
---
# Fix code to match the Requirements: Consumed request: chosen option keeps IDs the Requirement drops

## What happens

Il codice già fa ciò che il Model chiede: dopo un riavvio la scheda ripristinata di una richiesta consumata o abbandonata viene chiusa senza salvare né inviare, e non c'è più nessun invio senza il file. L'opzione scelta per il Task invece terrebbe nell'elenco delle richieste inviate anche le richieste finite, fino alla chiusura della scheda, quindi ricorderebbe proprio gli ID che il requisito vuole togliere.

## What should happen

Il Model dice che una richiesta consumata o abbandonata non torna mai inviabile, anche dopo un riavvio dell'editor. Il requisito sui dati dice che un ID il cui file non esiste più è tolto dall'elenco delle richieste inviate. Con l'opzione scelta le due regole non si possono seguire insieme: l'elenco terrebbe gli ID che il requisito elimina. Il Model è soddisfatto anche senza quell'elenco, quindi il Task non può essere implementato come scelto senza violare il requisito.

## Chosen option

**Togliere la scelta dal Task e tenere il codice com'è**

Le richieste il cui file è sparito escono dall'elenco, come dice il requisito. Nessun invio è possibile senza file, e le schede ripristinate vengono chiuse senza salvare: il comportamento voluto dal Model è rispettato. Costo: dopo un riavvio l'elenco non ricorda più le richieste finite, ma non serve, perché il file manca. Il Task si chiude senza modifiche al codice, come per il Task T2.

## Where in the code

extension/src/host/design-requests.ts: forgetMissing, finishMissing
