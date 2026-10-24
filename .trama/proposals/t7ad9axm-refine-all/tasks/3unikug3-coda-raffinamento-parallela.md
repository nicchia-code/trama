---
technical: false
refs:
  - raffinamento
  - agent-launching
  - requirements/rules#raffinamento
  - requirements/rules#developer.RAFFINA_TUTTE
  - requirements/rules#developer.ANNULLA_RAFFINA_TUTTE
  - requirements/tech#raffinamento
  - requirements/tech#developer.RAFFINA_TUTTE
  - requirements/data#raffinamento
  - requirements/quality#raffinamento
---
# Raffinamenti paralleli e Refine All

Lato host e core, il raffinamento delle Proposal obsolete (funzione Auto-update Stale Proposals, `trama.autoUpdateStaleProposals` letto solo da `globalValue === true` a ogni quadro e a ogni clic) passa da un raffinamento alla volta a più raffinamenti in parallelo per catene indipendenti, con una sola coda per finestra condivisa da `Approve` e dalla nuova azione `Refine All`, e con `Cancel Refine All`. Il disegno nel webview (voce del menu, timer dei 2 secondi, badge e tooltip) è fuori da questo Task: qui si producono i dati del quadro e la gestione dei messaggi.

## Coda e catene
- Una sola coda in memoria della finestra, nell'ordine del Backlog (`created`, poi identità), mai quello dei clic; una Proposal già in coda o in raffinamento non si aggiunge di nuovo. `Approve` su una Proposal da raffinare e `Refine All` mettono le Proposal nella stessa coda, con le stesse regole. Da raffinare: Proposal `kind: change`, non allegata a un Drift aperto, `open` e obsoleta, oppure Draft con `refining: true` che nessun raffinamento di questa finestra sta scrivendo (Draft rimasta a metà). Import, setup e risoluzioni mai.
- Catene: le Proposal in coda e quelle in raffinamento si dividono in catene; due stanno nella stessa catena quando toccano almeno un file in comune (chiavi di `base`, file della cartella della Proposal e `delete`, come per l'obsolescenza) o quando una richiede l'altra; relazione transitiva. I file toccati si leggono da una funzione nuova di `src/core/proposals.ts` estratta dall'insieme `touched` di `health()`, che `health()` riusa. Le catene non si salvano: si ricalcolano a ogni partenza dai file di quel momento. Dentro una catena lavora al più un raffinamento alla volta, nell'ordine delle dipendenze (come `requiredProposals`) e poi del Backlog; catene diverse lavorano insieme.
- Pronta: la prima Proposal in coda di una catena in cui nessun raffinamento lavora, se ogni Proposal che richiede è approvata. Una Proposal in coda che richiede una Proposal non approvata la aspetta finché quella è in coda, in raffinamento o raffinata in attesa della fine di un Run; quando quella non è più in nessuno di questi casi senza essere approvata, esce dalla coda senza partire e torna da raffinare.
- Posti: N è `trama.maxParallelAgents` (20 quando non vale). Ogni raffinamento al lavoro tiene almeno un posto dalla partenza alla fine del suo lavoro, e la somma dei posti tenuti non supera mai N. Con almeno un posto libero partono le Proposal pronte, nell'ordine del Backlog, al più tante quanti i posti liberi; i posti liberi si dividono in parti uguali fra quelle che partono insieme, almeno uno ciascuna, il resto alle prime (come la divisione dei posti fra i Run di Run all in parallelo, `shareSeats` di `extension/src/host/run-groups.ts`, da riusare). Una catena pronta senza posti liberi aspetta che un raffinamento finisca.
- Stato in memoria (mai sotto `.trama/` né in `workspaceState`): `queued` in ordine; per ogni raffinamento al lavoro, in una mappa che sostituisce i campi singoli `running` e `delivered`, l'identità della Proposal, i posti tenuti, il terminale o la conversazione del lavoro e se la Proposal è stata consegnata (avviso `proposal-delivered`) durante il lavoro; `waiting`, le Proposal raffinate in attesa della fine di un Run; l'istante del clic su `Refine All` finché `Refine All` è in corso, assente altrimenti. Riaprire l'editor perde tutto: le Proposal restano come sono nei file.

## Partenza e istruzione
- Ogni raffinamento è un lavoro a sé della finestra dal momento dell'invio reale, con il suo terminale o la sua conversazione di omp Chat. Istruzione: "Use the trama-design skill to refine the stale Proposal <id> on the current Model and Requirements, as the \"Refining a stale Proposal\" section says.", seguita sulla stessa riga, nello stesso ordine, dalle frasi dell'istruzione di una richiesta di design scritta: limite dei sotto-agenti con al posto di N i posti che quel raffinamento tiene, Sub-agents Context Sharing quando è acceso, domande, lingua. Terminale `Refine <numero breve>`; modello `trama.analysis`, mai quello scelto per la Proposal. Annuncio al lancio come oggi (Proposal legata, senza ghost a sé).
- Se l'istruzione di una Proposal che parte non parte davvero: la coda si svuota, i raffinamenti già al lavoro continuano, avviso `Trama: refining <numero breve> did not start: <motivo>.`; con un clic su `Refine All` da cui nessuna istruzione parte, la coda si svuota e le Proposal restano da raffinare.
- Un raffinamento non è un Run né una risoluzione: non rende indisponibili Run all, il Run dei Task, Resolve, Unify Drifts, scan, design e import, e nessuno di loro lo ferma.

## Fine di ogni raffinamento
Al primo segnale di fine di quel lavoro (hook a riposo, fine del turno in omp Chat, fine del comando, chiusura del terminale, controllo di esecuzione con l'avviso in cima alla Board), una volta sola e senza toccare gli altri raffinamenti al lavoro (segnali ripetuti idempotenti), Trama guarda la Proposal:
- consegnata durante il lavoro, `open` e non bloccata: la approva con la stessa funzione e gli stessi passi successivi dell'approvazione dal pannello (Task creati, rigenerazione delle skill); approvazione rifiutata → resta Open con l'avviso `Trama: <numero breve> was refined but not approved: <motivo>.`. Se un Run lanciato da questa finestra non è finito, l'approvazione aspetta: la Proposal va in `waiting` (badge `waiting for the run`) e alla fine del Run è guardata di nuovo con questo stesso elenco; tornata obsoleta nel frattempo rientra in coda senza approvazione;
- consegnata, `open` e di nuovo obsoleta: rientra in coda al suo posto, senza nuovo clic;
- consegnata, `open` e bloccata per altro motivo: resta Open con i suoi motivi;
- non consegnata: resta da raffinare (Open obsoleta o Draft rimasta a metà);
- `rejected`, `discarded`, `approved`: nulla.
Poi il raffinamento libera i suoi posti e partono le Proposal pronte; quelle non più da raffinare (approvate, rifiutate, non più obsolete) e quelle che aspettano una Proposal richiesta uscita senza approvazione escono dalla coda senza partire.

## Approve, Cancel e impostazione
- Il messaggio `approveProposal` non cambia: con la funzione attiva e una Proposal da raffinare l'host la mette in coda e lancia le pronte, altrimenti approva come oggi. Approve singolo resta indisponibile durante un Run (`refuseWhileRunning`), come oggi.
- `cancelRefinement { proposal }` vale solo su una Proposal in coda (l'host ricontrolla, altrimenti nulla): la toglie senza cambiare file. Un raffinamento in corso non si annulla. Rifiutare una Proposal in coda la toglie dalla coda.
- Spegnere la funzione svuota la coda (le Proposal tornano obsolete come senza funzione) e termina `Refine All` in corso; i raffinamenti al lavoro finiscono come sempre, approvazione compresa, ma nessun altro parte.

## Refine All e Cancel Refine All
- Presa di `Refine All`: nell'ordine del Backlog, ogni Proposal da raffinare non già in coda o in raffinamento il cui Approve sarebbe disponibile, senza contare il motivo `A run is in progress`, Draft rimaste a metà comprese; più quelle bloccate solo da Proposal richieste non approvate quando ognuna di quelle è presa a sua volta, già in coda, in raffinamento o in `waiting` (transitivo). `count` (`n`) conta le Proposal che il clic prenderebbe in quel momento.
- Motivi di indisponibilità, in quest'ordine: `Turn on Auto-update Stale Proposals in Settings` (funzione spenta), `No Proposal to refine` (`n` vale 0). Run in corso, altri raffinamenti, risoluzioni o unificazioni non la rendono indisponibile.
- Messaggio nuovo `{ type: "refineAll" }` (in `extension/src/protocol.ts`, validato in `extension/src/host/messages.ts`, senza altri campi): l'host ricontrolla al clic e con funzione spenta o `n` a 0 non fa nulla; altrimenti mette in coda tutte le Proposal prese in una volta sola, come altrettanti Approve, senza approvare né cambiare file, ricorda l'istante del clic e lancia le pronte. Ogni Proposal raffinata dopo `Refine All` si approva alla fine come con Approve, aspettando la fine di un Run se serve.
- `Refine All` resta in corso finché nella coda resta almeno una Proposal che aspetta di partire; quando la coda si svuota (partenze, uscite, `Cancel`, `Cancel Refine All`, funzione spenta) torna `refine`, anche con raffinamenti ancora al lavoro. Approve su una scheda senza `Refine All` in corso non lo cambia.
- Messaggio nuovo `{ type: "cancelRefineAll" }`, senza altri campi: l'host non fa nulla senza `Refine All` in corso o prima di 2 secondi dal clic su `Refine All`; altrimenti svuota tutta la coda, anche le Proposal messe con Approve, ognuna torna da raffinare senza cambiare file; i raffinamenti al lavoro continuano e finiscono come sempre, approvazione compresa; quelli in `waiting` restano in attesa.

## Quadro
L'host aggiunge al quadro `refinement: { enabled, running, queued, refineAll }`: `running` elenco delle identità in raffinamento in ordine di partenza; `queued` le Proposal in coda in ordine, ognuna `{ proposal, waiting: "approval" | "chain" | "slot", on? }` col motivo dell'attesa già calcolato dall'host (`approval`: aspetta che la Proposal `on` sia approvata; `chain`: aspetta che `on` della sua catena sia raffinata; `slot`: nessun posto libero); `refineAll: { mode: "refine" | "cancel", count, blockers, since }`, con `blockers` nell'ordine sopra calcolati con le stesse funzioni di Approve e `since` solo con `mode` `cancel`. Aggiornare `RefinementView` in `extension/src/protocol.ts` (oggi `running: string | null`). Il quadro si rimanda quando cambiano coda, raffinamenti al lavoro o impostazione.

## Sicurezza, test e documenti
- Solo il clic del developer su Approve o `Refine All`, tenuto in memoria, fa partire un raffinamento e la sua approvazione finale; nessun file del progetto, `refining: true` compreso, ne avvia uno o approva. Due Proposal che toccano lo stesso file o si richiedono non si raffinano mai insieme; i sotto-agenti di tutti i raffinamenti sommati non superano mai N.
- Test `bun:test` della logica pura in `extension/src/host/refinement.ts` (file `refinement.test.ts` nuovo): catene per file in comune e per `requires` transitivo, catene separate per file disgiunti, ordine delle dipendenze, Proposal che aspetta una richiesta ed esce quando quella non è approvata, divisione dei posti con N piccolo e grande, conteggio e scelta di `Refine All`, `Cancel Refine All` che svuota tutta la coda e lascia i lavori al lavoro, rientro in coda di una Proposal tornata obsoleta.
- `extension/README.md` e `CHANGELOG.md` descrivono `Refine All` e il raffinamento in parallelo.
