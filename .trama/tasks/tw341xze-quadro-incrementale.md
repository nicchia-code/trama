---
column: done
technical: true
refs:
  - requirements/tech#panel/Open
  - requirements/quality#panel
  - requirements/tech#announcement
drift: null
proposal: q90tj59p
agent: false
created: 2026-10-28T16:50:19.603Z
finished: 2026-10-28T17:41:17.554Z
---
# Quadro incrementale

Sul computer di lavoro (macOS, con antivirus/EDR che ispeziona ogni accesso ai file) ogni operazione dell'editor ha un ritardo. Oggi ogni quadro del progetto (`buildSnapshot`) rilegge e fa `statSync` di tutto `.trama/`: su questo repository circa 4.250 file, ~1.469 `statSync`, 224 letture di Modello e Requisiti, ~900 `existsSync`/`readdirSync` per quadro (41 ms a caldo, 525 ms a freddo), e un'azione del pannello ne costruisce due. A lavoro finito vale quanto segue.

## Un quadro per cambiamento, condiviso
- Un modulo dell'host, uno per finestra, possiede il quadro del progetto (`buildSnapshot` di `src/core/snapshot.ts`, chiamato con `driftsFinishing`, `proposalsFinishing` e `tasksFinishing` del progetto). Dopo la pausa di 150 ms del watcher globale di `.trama/**`, e a un cambio delle cartelle del workspace, costruisce un solo quadro e dà lo stesso oggetto al pannello (`Controller.refresh`), al menu laterale (numeri e nome di `tech#menu-laterale`), all'elemento ghost della barra di stato (`tech#announcement`), al controllo di esecuzione (`tech#time`) e alla stima di Run all. Le letture proprie del controllo di esecuzione sono di un altro Task; questo Task gli consegna il quadro.
- Un refresh chiesto da un'azione del pannello o da un evento dell'host (decisioni, Clear, Delete, round di domande, risoluzione dei Drift, impostazioni) costruisce subito un nuovo quadro, che vede sempre i file appena scritti, e lo dà a tutti; gli eventi del watcher che arrivano dopo per file già letti da quel quadro con stessi `mtimeMs`, `size` e `ino` non costruiscono un secondo quadro. Un'azione = un quadro.
- Una lettura fallita dà l'errore al pannello, che lo mostra come oggi e tiene il suo ultimo quadro; il menu tiene i suoi ultimi numeri.
- `Controller.refresh` non rilegge nulla che il quadro abbia già letto: i Drift aperti e ogni altra scheda per `resolve`, `unify`, `refinement` e `runEstimate` vengono dal quadro o dai file analizzati della stessa costruzione, non da nuovi `listDrifts`, `listTasks`, `listProposals`.
- Ciò che il messaggio del quadro porta da git (repository GitHub di `tech#editor-panel`, stato del Manager mode, target di Team) viene dai valori che la finestra tiene (`quality#General`): `Controller.refresh`, `postManager`, `teamRepository` e la vista Team non avviano processi git.
- Cambiare vista del pannello (`viewChanged`, `navigate`; dal menu laterale, da un comando della palette, da un focus o da un link interno) non costruisce quadri, non legge file di `.trama/` e non avvia processi nell'host: la vista cambia subito. Uniche eccezioni: la lettura di GitHub che la vista Team avvia in background (`rules#github-project`) e il controllo di omp alla prima apertura di Settings nella finestra (`tech#panel/Settings`); nessuna delle due trattiene la vista. Quando il pannello cambia vista o il menu torna visibile, il menu mostra subito l'ultimo stato senza leggere file né avviare processi; si sposta solo l'evidenziazione.

## Ogni file letto una volta
- `buildSnapshot` elenca ogni cartella di `.trama/` una volta e legge e analizza ogni file al più una volta per quadro. Le funzioni che chiama ricevono le schede già lette invece di rielencarle e rileggerle: `unifiedInto` e `unifiedDrifts`, `closedUnchanged`, `syncShortNumbers`, `teamViews` e i Task delle Proposte. Il tempo cresce linearmente col numero di file e di schede, mai col loro prodotto (per esempio Drift unificati per tutti i Drift).

## Cache dei file analizzati
- `src/core` ha una cache di documenti analizzati, per percorso assoluto, file di Modello e Requisiti compresi. Ogni voce tiene ciò che restituisce `readDocument` (front matter e corpo) con `mtimeMs`, `size` e `ino` dello stat fatto prima della lettura.
- Il modulo del quadro raccoglie i percorsi che il watcher segnala (creati, cambiati, cancellati) fra due quadri; un quadro fa stat, legge e analizza solo quelli, toglie le voci dei cancellati e prende tutto il resto dalla cache, con gli elenchi delle cartelle tenuti dal modulo e aggiornati dagli stessi eventi di creazione e cancellazione.
- Un controllo completo (elenco di ogni cartella di `.trama/` e stat di ogni file, rilettura di quelli i cui tre valori sono cambiati) gira all'apertura del progetto nella finestra e quando `window.onDidChangeWindowState` dice che la finestra è tornata in primo piano, in modo asincrono (`fs.promises`), senza trattenere il pannello; il suo risultato diventa il quadro successivo solo se qualcosa è cambiato.
- Valori derivati (Task bloccati, viste delle schede, numeri, decisioni) non vanno mai in cache: si ricalcolano a ogni quadro dai file analizzati. Ciò che la cache restituisce non viene mai modificato da chi lo riceve. Le funzioni che modificano una scheda la leggono senza cache, come fanno oggi i comandi. L'host tiene una cache per finestra, nel modulo del quadro, per la vita della finestra; la riga di comando costruisce i suoi quadri senza cache.
- Affidabilità: un file segnalato dal watcher, o trovato cambiato dal controllo completo, viene riletto (anche se riscritto con la stessa dimensione). Un cambiamento non segnalato (editor sospeso, cartella condivisa) si vede al prossimo cambiamento di quel file o al prossimo ritorno della finestra in primo piano.

## Altri lettori del progetto
- L'elemento ghost della barra di stato prende gli annunci dal quadro condiviso, con la stessa vista dei ghost dello Snapshot, a ogni nuovo quadro; l'host costruisce il quadro sul watcher globale di `.trama/**` anche a pannello chiuso, così l'elemento segue i file in ogni finestra aperta sul progetto. Non rilegge mai la cartella degli annunci a un evento grezzo del watcher.
- La stima di Run all e il controllo di esecuzione prendono Task, annunci e issue dal quadro, mai rileggendo le loro cartelle a ogni evento o ogni 60 s.

## Prove (`bun:test`)
Su un progetto con alcune centinaia di Drift (alcuni unificati), Proposte e voci di History: un quadro legge ogni file al più una volta, contato dalla cache; un secondo quadro senza cambiamenti non legge, non analizza e non fa stat di nessun file; un quadro dopo un evento del watcher per un file fa stat e legge solo quel file; un file riscritto con la stessa dimensione viene riletto; una scheda cancellata esce dal quadro; un file cambiato senza evento del watcher si vede dopo il controllo completo del ritorno in primo piano; un'azione che scrive file dà un quadro, non due; pannello e menu ricevono lo stesso quadro per un evento del watcher; il quadro costruito con la cache è uguale a quello costruito senza.

Esercizi di accettazione: passare fra tutte le viste a pannello aperto senza letture di file né processi; una scheda cambiata a mano che si vede al quadro successivo; una scheda cambiata fuori dall'editor con la finestra in background che si vede al ritorno della finestra; una scheda cancellata che esce dalla Board; Approve e Clear che mostrano subito il risultato, con un quadro ciascuno.

## Punti del codice
- `extension/src/host/picture.ts:39-113` — debounce di 150 ms su `**/.trama/**`; gli URI del watcher vengono buttati a `:40`; doppia costruzione per azione `:89-94` (refresh poi costruzione del watcher); scrittura di `synchronizeAnnouncementTitles` a `:107`
- `src/core/snapshot.ts:458-599` — `buildPicture`/`buildSnapshot`
- `src/core/document-cache.ts:31-49` — `statSync` di ogni file di scheda a ogni quadro
- `src/core/store.ts:73-113` — `readTree`/`readTracked` leggono ogni file di Modello e Requisiti a ogni quadro, fuori dalla cache
- `src/core/proposals.ts:211-216,254` — `existsSync`/`readdirSync` per le cartelle `tasks/` e `issues/` di ogni Proposta
- `src/core/task-images.ts:72` — `readdirSync` per ogni Task
- `src/core/short-numbers.ts:228-232` — scritture durante il quadro
- `extension/src/host/controller.ts:1253-1260,1321` — inneschi del refresh
- `extension/src/host/controller.ts:1343` → `src/core/proposal-models.ts:78-79` — `forgetProposalModels` con `listProposals`+`listTasks` senza cache
- `extension/src/host/activities-item.ts:33-39` — `listAnnouncements` a ogni evento di `.trama/**`, senza debounce
- `extension/src/host/run-all-estimate.ts:22-25` con `extension/src/host/controller.ts:1414-1422` — `blockedTasks` ricarica Modello/Task/Drift senza cache ogni 60 s
