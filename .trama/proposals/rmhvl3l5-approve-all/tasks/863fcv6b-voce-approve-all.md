---
technical: false
refs:
  - panel
  - requirements/ui
  - requirements/tech#developer.UNIFY_DRIFTS
---
# Voce Approve All

Sulla Board (webview) la seconda voce del menu della freccetta di `+ Add Work Item`, sotto `Unify Drifts`, non è più `Refine All` ma `Approve All`. Approve All fa tutto ciò che faceva Refine All e in più approva le Proposal che si possono già approvare: una cosa in più, non in meno. Questo Task copre solo la parte del webview (Board e dettagli del Diagramma) e i tipi del protocollo che usa; la logica dell'host (approvazione, coda, attesa del Run, avvisi) è di altri Task, e qui si consuma ciò che l'host manda nella Snapshot.

## Voce del menu
- Stessa forma di `Unify Drifts`: senza icona e senza tooltip; testo come descrizione accessibile, motivi di disabilitazione sotto l'etichetta in testo secondario piccolo (`ui#General`: le voci dei menu dei pulsanti divisi sono `Rework with feedback…`, `Unify Drifts`, `Approve All`, `Cancel Approve All`).
- Etichetta e nome accessibile `Approve All (<n>)`, con `n` il numero totale di Proposal che un clic prenderebbe, da approvare e da raffinare, aggiornato a ogni quadro; `Approve All`, senza numero, quando `n` vale 0. Un solo numero, nessuna conferma.
- Descrizione accessibile: `Approve every Proposal that can be approved; refine stale design Proposals first, then approve them`.
- Quando non si può usare resta nel menu, disabilitata e segnata come tale per le tecnologie assistive, con l'unico motivo `No Proposal to approve`. Il motivo legato all'impostazione (`Turn on Auto-update Stale Proposals in Settings`) sparisce: con Auto-update Stale Proposals spenta la voce resta disponibile e approva soltanto (le Proposal stale restano stale).
- Scegliere la voce abilitata chiude il menu e manda il messaggio `approveAll` (al posto di `refineAll`); non mostra campi, caselle né conferme. Al quadro seguente le schede approvate lasciano `Backlog`; i terminali `Refine <numero breve>` non prendono il focus.
- Mentre Approve All è in corso, la stessa voce allo stesso posto ha etichetta e nome accessibile `Cancel Approve All` e descrizione accessibile `Take every waiting Proposal out of the queue`. Nei primi 2 secondi dopo il clic su Approve All è disabilitata, senza motivo scritto; poi si abilita da sola, anche a menu aperto. Sceglierla chiude il menu e manda `cancelApproveAll` (al posto di `cancelRefineAll`), senza conferme; al quadro seguente le schede che aspettavano tornano `to refine`, o come le altre Proposal Open quando non erano da raffinare; quelle in raffinamento restano segnate finché finiscono e quelle in attesa del Run restano in attesa; la voce torna `Approve All (<n>)`.
- Tutti i testi sono in inglese e non seguono `trama.language`.

## Schede e dettagli
- Badge `queued` anche su una Proposal non da raffinare messa in coda da Approve All ad aspettare una Proposal che richiede (in attesa di approvazione), con tooltip e nome accessibile, il primo che vale: `Waiting for <numero breve> to be approved first`, `Waiting for <numero breve> to be refined first`, `Waiting for a free refining slot`.
- Su una Proposal in coda (coda di raffinamento o attesa di approvazione) `Approve` è disabilitato con il motivo `Already queued` (al posto di `Already queued for refining`). Il `Cancel` della scheda ha tooltip `Take <numero breve> out of the queue`. Dopo `Cancel` la scheda torna `to refine`, o come le altre Proposal Open, con il focus sul suo `Approve`.
- Una Proposal presa da Approve All senza raffinamento che aspetta la fine di un Run di questa finestra ha il badge `waiting for the run` con tooltip e nome accessibile `Trama approves it when the run in progress ends`; una Proposal raffinata in attesa tiene `Refined; Trama approves it when the run in progress ends`. `Approve` è disabilitato con `A run is in progress`; `Reject` e la sua freccetta restano abilitati. Alla fine del Run il badge sparisce al quadro successivo. Queste schede vanno mostrate anche con l'impostazione spenta (oggi `refineStatus` restituisce null quando il raffinamento è spento).
- Gli avvisi `Trama: <numero breve> was not approved: <motivo>.` (uno per Proposal rifiutata) e quelli del raffinamento stanno in cima alla Board con il pulsante di chiusura degli altri avvisi.
- Nei dettagli del Diagramma `Approve` di una Proposal in coda, in attesa di approvazione o in attesa del Run è disabilitato con gli stessi motivi della Board.
- Testi di `ui#panel` (icone: le voci `Unify Drifts`, `Approve All`, `Cancel Approve All` senza icona) e `ui#unify-drifts` (Unify Drifts sopra Approve All): nessun riferimento residuo a Refine All.

## Dove cambiare
- `extension/src/webview/board/logic.ts`: `refineAllEntry` (rinominare in `approveAllEntry`, etichette, descrizioni, messaggi), `REFINEMENT_OFF` (blockers solo `No Proposal to approve`), `CANCEL_REFINE_ALL_DELAY_MS` (rinominare), `QUEUED_REASON` (`Already queued`), `WAITING_RUN_TIP` e nuovo tooltip per le Proposal non raffinate, `refineStatus`/`refineApproveBlocker` e `proposalCard` (queued per attesa di approvazione, tooltip del `Cancel`, badge in attesa anche a impostazione spenta).
- `extension/src/webview/board/index.tsx`: voce del menu `items` (circa righe 343-370) e timer di Cancel (righe 203-211).
- `extension/src/webview/diagram/panel.tsx`: blocker di Approve (circa righe 341-342).
- `extension/src/protocol.ts`: `RefineAllView` → `ApproveAllView`, campo `refineAll` → `approveAll` di `RefinementView`, tipi dei messaggi `approveAll`/`cancelApproveAll`, con i commenti; coordinare i nomi con il Task dell'host.
- Test: `extension/test/board-render.test.tsx` (righe ~727-822, voce, motivi, timer, badge) e `extension/test/board-logic.test.ts` (righe ~198-199).
- Documentazione: `extension/README.md` e `CHANGELOG.md` li aggiorna il Task `shvizreb` (lato host); questo Task non li tocca.
