---
status: resolved
resolution: fix-code
refs:
  - requirements/data#design-request
proposal: null
task: goz9bn38
origin: nxbplkgj
option: 1
note: null
resolvedBy: vgoluaem
created: 2026-10-10T10:12:21.849Z
---
# Consumed request: chosen option keeps IDs the Requirement drops

## What happens

Il codice già fa ciò che il Model chiede: dopo un riavvio la scheda ripristinata di una richiesta consumata o abbandonata viene chiusa senza salvare né inviare, e non c'è più nessun invio senza il file. L'opzione scelta per il Task invece terrebbe nell'elenco delle richieste inviate anche le richieste finite, fino alla chiusura della scheda, quindi ricorderebbe proprio gli ID che il requisito vuole togliere.

## What should happen

Il Model dice che una richiesta consumata o abbandonata non torna mai inviabile, anche dopo un riavvio dell'editor. Il requisito sui dati dice che un ID il cui file non esiste più è tolto dall'elenco delle richieste inviate. Con l'opzione scelta le due regole non si possono seguire insieme: l'elenco terrebbe gli ID che il requisito elimina. Il Model è soddisfatto anche senza quell'elenco, quindi il Task non può essere implementato come scelto senza violare il requisito.

## Fix options

### Togliere la scelta dal Task e tenere il codice com'è

Le richieste il cui file è sparito escono dall'elenco, come dice il requisito. Nessun invio è possibile senza file, e le schede ripristinate vengono chiuse senza salvare: il comportamento voluto dal Model è rispettato. Costo: dopo un riavvio l'elenco non ricorda più le richieste finite, ma non serve, perché il file manca. Il Task si chiude senza modifiche al codice, come per il Task T2.

### Tenere un elenco separato delle richieste finite

Le richieste consumate o abbandonate restano in un elenco di stato distinto da quello delle richieste inviate, tolto quando la scheda si chiude. Costo: uno stato in più da mantenere e svuotare, e una deroga di fatto al requisito sui dati, che tratta l'elenco come quello degli ID inviati.

### Riscrivere il requisito sui dati con una Proposal

Il requisito cambia perché gli ID finiti restino nell'elenco fino alla chiusura della scheda, e il codice segue. Costo: una Proposal da approvare, e un cambio di regola valido per ogni richiesta, anche per le scelte del Model che oggi non lo richiedono.

## Where in the code

extension/src/host/design-requests.ts: forgetMissing, finishMissing
