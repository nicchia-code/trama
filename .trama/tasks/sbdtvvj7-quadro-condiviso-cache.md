---
column: done
technical: false
refs:
  - panel
  - requirements/tech#panel/Open
  - requirements/quality#panel
drift: null
proposal: adyvleqj
agent: false
created: 2026-10-26T12:16:40.800Z
finished: 2026-10-26T12:41:46.900Z
---
# Quadro unico con cache

Il quadro del progetto (`buildSnapshot`, `src/core/snapshot.ts`) costa già ~450 ms su un Mac senza antivirus, su un progetto con ~400 Drift e ~360 Proposal. Ogni cambiamento dei file lo fa costruire due volte, una dal pannello e una dal menu laterale.

Il profilo mostra da dove viene il costo:

- circa il 60% è `unifiedInto` (`src/core/work.ts`), che per ogni Drift unificato rilegge tutti i Drift con `listDrifts`;
- circa il 10% è la sincronizzazione dei numeri brevi, che rilegge le schede;
- circa il 9% sono le viste dei handoff di Team, che rileggono le Proposal;
- il resto è leggere e analizzare YAML e Markdown di tutti i file a ogni quadro.

Quando il Task è finito:

- **Una lettura per quadro.** `buildSnapshot` elenca ogni cartella di `.trama/` una sola volta e legge e analizza ogni file al massimo una volta per quadro. `unifiedInto`, `unifiedDrifts`, `closedUnchanged`, `syncShortNumbers`, `teamViews` e i Task delle Proposal ricevono le schede già lette invece di rileggerle. Il tempo del quadro cresce in modo lineare con il numero di file. Il quadro resta identico a quello di oggi, campo per campo.
- **Cache dei file analizzati.** In `src/core` c'è una cache dei documenti analizzati, per percorso assoluto. Ogni voce tiene ciò che restituisce `readDocument` insieme a `mtimeMs`, `size` e `ino` dello `statSync` fatto prima della lettura.
  - Un quadro costruito con la cache fa `stat` di ogni file che gli serve. Rilegge e rianalizza solo i file nuovi o con uno dei tre valori cambiato, e toglie le voci dei file spariti.
  - Elenchi delle cartelle e valori derivati (Task bloccati, viste, numeri, decisioni) non sono mai in cache: si ricalcolano a ogni quadro.
  - Chi riceve un valore dalla cache non lo modifica. Le funzioni che cambiano una scheda la leggono senza cache, come fanno oggi i comandi.
  - L'host tiene una cache per finestra, per tutta la vita della finestra. La riga di comando costruisce senza cache.
- **Un solo quadro per cambiamento.**
  - Un modulo dell'host, uno per finestra, costruisce il quadro dopo la pausa di 150 ms del watcher globale di `.trama/**` e a ogni cambio delle cartelle dell'area di lavoro. Dà lo stesso oggetto al pannello (`Controller.refresh`) e al menu laterale: i numeri e il nome del progetto di `MenuView`, che non chiama più `buildSnapshot` da sé.
  - Un refresh chiesto da un'azione del pannello o da un evento dell'host (decisioni, Clear, Delete, round di domande, risoluzione dei Drift, impostazioni) costruisce subito un quadro nuovo, così vede sempre i file che l'azione ha appena scritto, e lo dà anche al menu.
  - Una lettura fallita dà l'errore al pannello, che lo mostra come oggi e tiene l'ultimo quadro; il menu tiene i suoi ultimi numeri.
- **Nessuna rilettura in `Controller.refresh`.** I Drift aperti e le altre schede che servono a `resolve`, `unify`, `refinement` e `runEstimate` vengono dal quadro, o dai file analizzati della stessa costruzione, invece che da nuovi `listDrifts`, `listTasks` o `listProposals`.
- **Cambiare vista non rilegge nulla.** Cambiare vista nel pannello non costruisce un quadro, non legge file di `.trama/` e non avvia processi nell'host. L'unica eccezione resta la lettura di GitHub in sottofondo quando compare la vista Team.
- **Test `bun:test`.**
  - Un quadro di un progetto con qualche centinaio di Drift (alcuni unificati), Proposal e voci di History legge ogni file al massimo una volta, contato dalla cache.
  - Un secondo quadro senza cambiamenti non legge né analizza file.
  - Un file riscritto con la stessa dimensione si rilegge.
  - Una scheda cancellata esce dal quadro.
  - Per un evento del watcher, pannello e menu ricevono lo stesso quadro.
  - Il quadro con la cache è uguale a quello senza.
- **Documentazione.** `CHANGELOG.md` registra il cambiamento.
