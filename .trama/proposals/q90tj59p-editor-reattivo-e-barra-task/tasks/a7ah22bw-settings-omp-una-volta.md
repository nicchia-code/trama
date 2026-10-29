---
technical: false
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - requirements/quality#panel/Settings
  - requirements/tech#panel/Settings
---
# Settings: omp una volta

Sul computer di lavoro del developer (macOS con antivirus/EDR che ispeziona ogni avvio di processo) ogni apertura della scheda Settings avvia oggi processi: `omp models --json`, `omp --version` e diverse chiamate git sincrone. Alla fine nessuna apparizione della scheda Settings né della Board avvia processi o controlli, salvo la prima necessità nella finestra.

Cosa deve essere vero alla fine:
- Lo stato di omp (`ompStatus`) e l'elenco dei modelli (`modelSuggestions`) si preparano una sola volta per finestra, alla prima necessità: la prima apparizione della scheda Settings (anche quando il pannello si apre su Settings con `developer.SHOW_SETTINGS` o con `developer.OPEN_GUIDED_SETUP`, da Closed come da Open) oppure la Board che chiede i modelli di una Proposal. Una sola chiamata `ompModels` serve sia l'elenco sia il numero di modelli dello stato.
- Si preparano di nuovo solo dopo i cambiamenti che possono alterarli, cioè ogni `refreshOmp(true)`: `trama.ompPath`, fine del terminale di installazione, login o logout di un fornitore, chiave API di Cursor, certificati di sistema (fine dell'esportazione o modalità spenta).
- Ogni altra apparizione di Settings o della Board riceve subito l'ultimo risultato tenuto dalla finestra (`ompStatus` `done` con versione e numero di modelli o motivo, `providers`, `modelSuggestions`), senza avviare niente e senza passare per `checking`. La sezione Providers mostra l'ultimo stato, non torna in attesa a ogni apparizione.
- Le righe Solo Mode e lo stato Manager in Settings usano i valori che la finestra già tiene (origin e stato Solo tenuti per finestra da un altro Task che rende git asincrono): mostrare Settings non lancia nessun git. Questo Task non cambia come quei valori si calcolano; toglie soltanto le letture sincrone fatte a ogni apparizione.
- Restano invariati: scadenza di 15 s di omp, avvio senza shell con argomenti fissi, nessuna chiamata di rete, motivi d'errore come testi fissi, la scheda Settings non aggiorna omp, i campi utilizzabili subito con la tendina che compare quando l'elenco arriva. I file di istruzioni dell'agente possono continuare a essere chiesti come oggi.

Dove nel codice:
- `extension/src/webview/settings/index.tsx:222-228` — `show()` azzera `providers` e manda `modelSuggestionsWanted`/`ompStatusWanted` a ogni apparizione
- `extension/src/host/controller.ts:1482-1490` — gestore di `ompStatusWanted`: `postSolo` e `postManager` (git sincrono) e `refreshOmp()`
- `extension/src/host/controller.ts:759-787` — `refreshOmp`: va tenuto l'ultimo risultato per finestra e rimandato senza nuove chiamate quando non è `fresh`
- `extension/src/webview/board/index.tsx:297-299` — la Board chiede l'elenco al montaggio
- `extension/src/host/model-lists.ts` — `ompModels`
- `extension/src/host/controller.ts:514-540,636-650` — `recheckOmp`/`refreshOmp(true)` dopo certificati, login, logout, chiave di Cursor: unici punti che preparano di nuovo
