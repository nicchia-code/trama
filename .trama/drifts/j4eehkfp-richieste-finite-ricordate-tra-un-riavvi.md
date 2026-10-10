---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#design-request
proposal: null
task: aws5w2wy
origin: nxbplkgj
option: 1
note: null
resolvedBy: s1fhgqej
created: 2026-10-10T09:05:37.714Z
---
# Richieste finite ricordate tra un riavvio e l'altro contro l'elenco dei requisiti

## What happens

Dopo un riavvio, una richiesta consumata o abbandonata con la scheda ripristinata con modifiche non salvate torna inviabile: il file è riscritto e l'agente riceve l'istruzione. L'opzione scelta per il Task (ricordare le richieste finite fino alla chiusura della scheda) richiede di tenere nell'elenco salvato ID il cui file non esiste più.

## What should happen

Una richiesta finita non torna mai inviabile dopo un riavvio. L'elenco salvato toglie un ID il cui file non esiste più (.trama/requirements/data/agents.md, riga 9), quindi l'opzione scelta contraddice il requisito.

## Fix options

### Derivare la fine dal file

Una richiesta il cui file non esiste più è finita: la scheda ripristinata viene chiusa senza salvare e senza inviare, e l'elenco salvato non serve per le finite. Costo: se l'utente salva a mano una scheda ripristinata con modifiche, il file torna e la richiesta diventa di nuovo inviabile.

### Cambiare il requisito

Prima il requisito dei dati (.trama/requirements/data/agents.md, riga 9) cambia per tenere nell'elenco le richieste finite fino alla chiusura della scheda; poi si implementa l'opzione scelta. Costo: una modifica ai requisiti da fare dallo sviluppatore.

## Where in the code

extension/src/host/design-requests.ts: finished, forgetMissing, send, deliver
