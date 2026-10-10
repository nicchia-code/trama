---
status: resolved
resolution: fix-code
refs:
  - drift/Open/developer.FIX_DRIFT_CODE
  - drift/Open/proposal.APPROVED
proposal: null
task: zvc6rarm
origin: null
option: 1
note: null
resolvedBy: tvdw2ygf
created: 2026-10-09T10:19:19.041Z
---
# A Drift whose Model reference no longer resolves cannot be fixed in the code

## What happens

Quando un Drift aperto punta a un elemento del Modello che nel frattempo è sparito o è stato rinominato (il pannello lo mostra con la nota `no longer resolves`), **tenere ciò che dovrebbe succedere** fallisce con un errore sul riferimento ("Cannot resolve …"): il Task di correzione non nasce e il Drift resta Open. Al developer resta solo chiudere il Drift senza cambiare nulla.

Peggio, in una **Proposal di risoluzione** che elenca quel Drift con la decisione di correggere il codice, la registrazione e la consegna passano senza errori, ma l'approvazione si ferma a metà: la Proposal risulta approvata, il Modello è già cambiato e nessuno dei Drift elencati è stato risolto.

## What should happen

Il Modello dice che decidere di correggere il codice **crea sempre** un Task in To do che punta agli stessi elementi del Drift, con le sue descrizioni, l'opzione scelta e la nota, e sposta l'origine in To do. Fra i rifiuti previsti c'è solo quello sull'opzione mancante o inesistente.

Approvare una risoluzione deve risolvere insieme tutti i Drift elencati ancora aperti: non esiste il caso di un'approvazione che lascia la Proposal approvata e i Drift aperti.

## Fix options

### Task sul contenitore esistente più vicino

Il Task di correzione punta ai riferimenti del Drift ancora validi e, per quelli spariti, all'elemento che li conteneva e c'è ancora (come fa la scansione per ciò che è stato tolto). Il Drift si può sempre correggere e l'approvazione di una risoluzione non si ferma. Costa un po' di precisione: il Task è più largo di ciò che il Drift indicava.

### Task che conserva i riferimenti spariti

Il Task di correzione nato da un Drift tiene i riferimenti del Drift così come sono, anche quelli che non si risolvono più, e il Requisito sui Task ammette questa eccezione. Il testo del Drift resta intatto, ma c'è un Task con riferimenti che non portano a nulla.

### Rifiutare la correzione e dirlo nel Modello

Il comando e la registrazione nella risoluzione rifiutano con un messaggio chiaro la correzione di un Drift con riferimenti spariti, e il Modello lo prevede: il developer può solo chiuderlo o aggiornare il Modello. Niente più approvazioni a metà, ma un Drift con riferimenti spariti non si può più correggere.

## Where in the code

src/core/work.ts (creazione del Task di correzione e risoluzione dei Drift elencati); src/core/proposals.ts (approvazione di una risoluzione)
