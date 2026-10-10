---
column: done
technical: false
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift/Open/proposal.APPROVED
drift: 3334u7kd
proposal: null
agent: false
created: 2026-10-09T10:54:14.801Z
finished: 2026-10-09T11:02:04.353Z
---
# Fix code to match the Model: A Drift whose Model reference no longer resolves cannot be fixed in the code

## What happens

Quando un Drift aperto punta a un elemento del Modello che nel frattempo è sparito o è stato rinominato (il pannello lo mostra con la nota `no longer resolves`), **tenere ciò che dovrebbe succedere** fallisce con un errore sul riferimento ("Cannot resolve …"): il Task di correzione non nasce e il Drift resta Open. Al developer resta solo chiudere il Drift senza cambiare nulla.

Peggio, in una **Proposal di risoluzione** che elenca quel Drift con la decisione di correggere il codice, la registrazione e la consegna passano senza errori, ma l'approvazione si ferma a metà: la Proposal risulta approvata, il Modello è già cambiato e nessuno dei Drift elencati è stato risolto.

## What should happen

Il Modello dice che decidere di correggere il codice **crea sempre** un Task in To do che punta agli stessi elementi del Drift, con le sue descrizioni, l'opzione scelta e la nota, e sposta l'origine in To do. Fra i rifiuti previsti c'è solo quello sull'opzione mancante o inesistente.

Approvare una risoluzione deve risolvere insieme tutti i Drift elencati ancora aperti: non esiste il caso di un'approvazione che lascia la Proposal approvata e i Drift aperti.

## Chosen option

**Task sul contenitore esistente più vicino**

Il Task di correzione punta ai riferimenti del Drift ancora validi e, per quelli spariti, all'elemento che li conteneva e c'è ancora (come fa la scansione per ciò che è stato tolto). Il Drift si può sempre correggere e l'approvazione di una risoluzione non si ferma. Costa un po' di precisione: il Task è più largo di ciò che il Drift indicava.

## Where in the code

src/core/work.ts (creazione del Task di correzione e risoluzione dei Drift elencati); src/core/proposals.ts (approvazione di una risoluzione)
