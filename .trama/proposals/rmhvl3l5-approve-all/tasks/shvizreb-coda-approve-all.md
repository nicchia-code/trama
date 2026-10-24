---
technical: false
refs:
  - agent-launching
  - raffinamento
  - developer.APPROVA_TUTTE
  - developer.ANNULLA_APPROVA_TUTTE
  - developer.ANNULLA_RAFFINAMENTO
  - requirements/rules
  - requirements/tech
  - requirements/data#raffinamento
  - requirements/quality#raffinamento
---
# Coda di Approve All

Lato host, la voce `Refine All` diventa `Approve All`: fa tutto ciò che faceva prima (mette in coda le Proposal da raffinare) e in più approva subito le Proposal già approvabili. Gli Eventi `developer.RAFFINA_TUTTE` e `developer.ANNULLA_RAFFINA_TUTTE` non esistono più: al loro posto `developer.APPROVA_TUTTE` e `developer.ANNULLA_APPROVA_TUTTE`, con le regole nel nuovo frammento `requirements/rules/approva-tutte.md` (sezioni `developer.ANNULLA_RAFFINAMENTO`, `developer.APPROVA_TUTTE`, `developer.ANNULLA_APPROVA_TUTTE`) e le sezioni vecchie tolte da `rules#raffinamento`. Nasce l'Evento `raffinamento.APPROVAZIONE_PRONTA`, che porta la Proposal da Open ad Approved.

## Scelta e conteggio
- Approvabile: Proposal `open` in Backlog, di qualunque `kind` (`change`, `import`, `setup`, `resolution`), non allegata a un Drift aperto, non da raffinare, con `approvalBlock` nullo e con l'agente che l'ha consegnata a fine turno: le stesse condizioni di `Approve` sulla scheda, senza contare `A run is in progress`.
- Approve All prende, nell'ordine del Backlog, ogni Proposal non già in coda, in raffinamento o in attesa della fine di un Run, che è approvabile oppure, con Auto-update Stale Proposals acceso, da raffinare con `Approve` disponibile (Draft rimaste a metà comprese). Prende anche una Proposal approvabile o da raffinare a parte le Proposal che richiede, bloccata solo da Proposal richieste non approvate, quando ognuna di quelle è presa a sua volta, è già in coda, in raffinamento o in attesa della fine di un Run (relazione transitiva). Con la funzione spenta prende solo le approvabili e quelle che aspettano soltanto approvabili prese o Proposal in attesa della fine di un Run; le obsolete restano obsolete.
- Una funzione pura in `extension/src/host/refinement.ts` sostituisce `refineAllPick`/`PickFact`/`refineAllBlockers`: riceve per ogni Proposal in Backlog un fatto (`approvable`, `refine`, `requires` con le identità richieste, `other`), calcolato dall'host con `approvalBlock` (`src/core/proposals.ts`), `refinementBlock`, `requireNotAttached` (`src/core/work.ts`) e l'attesa della fine del turno, e restituisce le Proposal prese in ordine. La stessa funzione dà `count` a ogni quadro (`refinementPicture` nel controller). Nel controller `refineAllTake` è sostituito dall'equivalente che conosce ogni `kind`.
- Unico motivo di indisponibilità: `No Proposal to approve`, con `count` a 0. Funzione spenta, Run in corso, raffinamento al lavoro, risoluzione o unificazione non la rendono indisponibile: spariscono `REFINE_ALL_OFF` e `REFINE_ALL_NONE` come motivi distinti.

## Clic su Approve All
Messaggio `{ type: "approveAll" }`, senza altri campi. Nessuna conferma. L'host ricontrolla e prende le Proposal al clic; con nessuna Proposal da prendere non fa nulla. `refuseWhileRunning` (`A run is in progress`) non vale per `approveAll`. Poi, in una volta sola:
1. Senza un Run lanciato da questa finestra in corso, approva le Proposal prese che non sono da raffinare e non aspettano Proposal in coda, in raffinamento o in attesa del Run, nell'ordine di `dependencyOrder` (prima le richieste, come `requiredProposals`) e poi del Backlog, ciascuna con `approveProposal` di `src/core` e gli stessi passi successivi dell'approvazione dal pannello (rigenerazione delle skill, Task creati). Subito prima di ognuna ricalcola `approvalBlock`: una Proposal resa obsoleta da un'approvazione dello stesso clic, con la funzione accesa e se è da raffinare, va in coda come le altre da raffinare (con la funzione spenta resta obsoleta); ogni altra Proposal non approvabile o con approvazione rifiutata resta Open, e l'host raccoglie l'avviso `Trama: <numero breve> was not approved: <motivo>.`, uno per Proposal, e continua con le altre. Alla fine manda un solo `refresh`.
2. Con un Run lanciato da questa finestra in corso non approva nulla: le stesse Proposal vanno in `waiting` con il badge `waiting for the run`, anche con la funzione spenta. `releaseWaiting` alla fine del Run le guarda nell'ordine delle dipendenze e del Backlog con la regola del punto 1, anche se non sono state raffinate.
3. Mette in coda, come altrettanti `Approve`, le Proposal da raffinare prese, quelle diventate da raffinare nel punto 1 e quelle che aspettano una Proposal in coda o in raffinamento (in attesa di approvazione), poi chiama `pumpRefinement`.

Se qualcosa è entrato in coda la finestra ricorda l'istante del clic (`since`) e che Approve All è in corso, finché nella coda resta almeno una Proposal che aspetta; quando la coda si svuota (partenze, approvazioni, uscite, `Cancel` sulle schede, `Cancel Approve All` o funzione spenta) torna `Approve All`, anche con raffinamenti ancora al lavoro. Un clic che approva soltanto o mette soltanto in attesa del Run non cambia la voce, come Approve su una scheda senza Approve All in corso. Se nessuna istruzione di raffinamento parte davvero, le approvazioni dirette restano fatte, la coda si svuota e ogni Proposal torna com'era.

## Coda: voci in attesa di approvazione
Ogni voce di `queued` (stato in memoria, mai sotto `.trama/` né in `workspaceState`) porta se è da raffinare o in attesa di approvazione. Una voce in attesa di approvazione sta nella catena della Proposal che aspetta (per `requires`) e non tiene posti. Quando è pronta (le Proposal richieste approvate), `pumpRefinement` non lancia nessun agente e non usa posti: se non è obsoleta e `approvalBlock` è nullo la approva subito (`raffinamento.APPROVAZIONE_PRONTA`), oppure, con un Run della finestra in corso, la mette in `waiting`; se è diventata obsoleta e la funzione è accesa diventa da raffinare e parte come le altre; altrimenti esce dalla coda, resta Open e compare `Trama: <numero breve> was not approved: <motivo>.`. Esce dalla coda senza partire, tornando com'era, se una Proposal che aspetta non è approvata e non è più in coda, in raffinamento né in `waiting`. Alla fine di un lavoro, quando la coda resta senza Proposal che possano partire, l'host approva quelle della coda non da raffinare e approvabili. `Cancel` sulla scheda (`cancelRefinement`) vale anche per le voci in attesa di approvazione; l'host ricontrolla che sia ancora in coda, altrimenti non fa nulla.

## Cancel Approve All e funzione spenta
- Messaggio `{ type: "cancelApproveAll" }`: l'host non fa nulla senza Approve All in corso o prima di 2 secondi da `since`. Altrimenti svuota tutta la coda, anche delle Proposal messe con Approve e di quelle in attesa di approvazione, ognuna torna com'era (da raffinare o Open) senza cambiare file; approvazioni già fatte restano, le Proposal in `waiting` restano in attesa, i raffinamenti al lavoro continuano e finiscono con approvazione. La voce torna `Approve All`.
- Spegnere Auto-update Stale Proposals (`refresh` del controller, `emptyQueue`) svuota la coda anche delle voci in attesa di approvazione; i raffinamenti in corso finiscono come sempre; `waiting` non si tocca.

## Messaggi e quadro
- In `extension/src/protocol.ts` e `extension/src/host/messages.ts` i messaggi `refineAll` e `cancelRefineAll` sono sostituiti da `approveAll` e `cancelApproveAll`; quelli vecchi non sono più accettati. Handler nel controller (`extension/src/host/controller.ts`, oggi `refineAll` e `cancelRefineAll`) rinominati di conseguenza; `refineAllClicked`/`cancelRefineAllAllowed` in `refinement.ts` diventano gli equivalenti di Approve All.
- Nel quadro `refinement.refineAll` diventa `refinement.approveAll`, `{ mode: "approve" | "cancel", count, blockers, since }`, mandato anche con la funzione spenta; `mode` vale `cancel` mentre Approve All è in corso; `since` solo con `mode` `cancel`. Aggiornare `RefineAllView` in `protocol.ts`. Il webview non calcola regole da sé (la voce del menu è di un altro Task).
- Sicurezza: solo il clic del developer, tenuto in memoria, avvia le approvazioni di Approve All, anche quelle in attesa di un Run o di una Proposal richiesta; nessun file del progetto le avvia.

## Test e documenti
- `test/refinement.test.ts`: conteggio e scelta con approvabili di ogni `kind`, da raffinare, in attesa di approvazione e con la funzione spenta; voce in attesa di approvazione approvata senza posti quando è pronta; `Cancel Approve All` che svuota tutta la coda e lascia i lavori al lavoro e le attese del Run; rientro in coda di una Proposal tornata obsoleta; aggiornare i casi esistenti di `refineAllPick`/`refineAllBlockers`.
- `test/host-agent-terminals.test.ts`: approvazione diretta in ordine di dipendenza, la Proposal resa obsoleta dallo stesso clic che va in coda, approvazione rifiutata con il suo avviso, clic durante un Run (in `waiting`, approvata alla fine del Run); aggiornare i test esistenti di `refineAll`/`cancelRefineAll`.
- `test/host-messages.test.ts`: `approveAll` e `cancelApproveAll` accettati senza altri campi, `refineAll` e `cancelRefineAll` rifiutati.
- `extension/README.md` e `CHANGELOG.md` descrivono `Approve All` al posto di `Refine All`.
