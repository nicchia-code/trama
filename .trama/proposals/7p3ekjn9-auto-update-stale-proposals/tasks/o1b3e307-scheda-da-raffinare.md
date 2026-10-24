---
technical: false
refs:
  - panel
  - requirements/ui#panel/Board
  - requirements/ui#panel/Settings
  - requirements/ui#raffinamento
  - requirements/rules#setup-wizard
---
# Scheda da raffinare

Il pannello mostra le Proposal obsolete come "da raffinare" quando l'impostazione `trama.autoUpdateStaleProposals` (Auto-update Stale Proposals) è accesa. Con l'impostazione spenta la Board, il Diagramma e le schede restano esattamente come oggi (badge `stale`, Approve bloccato con il suo motivo attuale).

Dati in ingresso, prodotti da altri Task: il frame dell'host porta `refinement: { enabled, running, queued }` (funzione accesa, Proposal in raffinamento, coda della finestra), e `ProposalView` (`src/core/snapshot.ts`) ha il campo `refining`, che segnala anche una Draft rimasta a metà di un raffinamento. La webview invia il messaggio esistente `approveProposal` e il nuovo `cancelRefinement { proposal }` (dichiararlo in `extension/src/protocol.ts`; il gestore nell'host è di un altro Task).

## Board (`extension/src/webview/board/logic.ts`, `cards.tsx`)
- Proposal da raffinare (obsoleta, funzione attiva): al posto del badge `stale` il chip `to refine` nel tono primario blu del tema, non in quello degli avvisi; tooltip e nome accessibile `The Model changed under this Proposal. Approve refines it on the current Model, then approves it.` Il colore non è l'unico segnale.
- Su quella scheda `Approve` ha testo e icona di sempre ed è abilitato, tooltip `Refine it on the current Model, then approve it`. Resta disabilitato, con i motivi di oggi, solo se una Proposal richiesta la blocca (non approvata, rifiutata, scartata, mancante, in un ciclo) o se l'agente che l'ha consegnata non ha finito il turno; gli altri blocchi (obsoleta, invalida per il Modello cambiato, voci scoperte, file non registrati) non lo disabilitano. Il clic invia `approveProposal`. `Reject` e la sua freccetta restano come oggi. Adattare `approveBlocker` e `proposalBadges` (badge stale ~311, motivo stale ~298).
- Draft rimasta a metà raffinamento: ha la scheda al suo posto nell'ordine di creazione, come una Proposal aperta, e conta fra ciò che aspetta una decisione; chip `to refine` con tooltip e nome accessibile `Refining stopped before the hand-over. Approve resumes it.`, `Approve` abilitato, `Reject` disabilitato con motivo `Approve to resume refining first`.
- In raffinamento (`refinement.running`): la scheda resta al suo posto in `Backlog`, anche da Draft; badge `refining` al posto di `to refine` (tooltip e nome accessibile `The agent is refining this Proposal on the current Model`) e il bordo blu-ciano animato della scheda di un Task preso dall'agente, riusando quello stile, fermo con la riduzione del movimento. Sotto i badge una riga attenuata con la fase: `Refining`, oppure `Waiting for your answers` mentre un round dell'agente è aperto; sotto ancora l'ultima nota dell'agente, come in un ghost. `Approve`, `Reject` e freccetta disabilitati con motivo `The agent is refining this Proposal`. Ingranaggio del modello, modale del corpo, `View on diagram`, `View requirements` restano come sono.
- In coda (`refinement.queued`): badge `queued` al posto di `to refine`, tooltip e nome accessibile `Waiting for <numero breve> to be refined first` (numero breve della Proposal in raffinamento). `Approve` disabilitato con motivo `Already queued for refining`; accanto un `Button` variante `outline` con icona `X`, testo `Cancel`, tooltip e nome accessibile `Take <numero breve> out of the refining queue`, che invia `cancelRefinement { proposal }`. `Reject` e freccetta abilitati. Dopo `Cancel`, al nuovo quadro la scheda torna `to refine` e il focus va sul suo `Approve`.
- Gli avvisi del raffinamento (per esempio `Trama: <numero breve> was refined but not approved: <motivo>.`, `Trama: refining <numero breve> did not start: <motivo>.`) compaiono in cima alla Board con il pulsante di chiusura degli altri avvisi.
- Due righe di `ui#panel/Board` cambiano: nessun'altra scheda oltre a quella di un Task preso ha il bordo animato, salvo la scheda di una Proposal in raffinamento; la Board non mostra come scheda nessuna Proposal che l'agente sta scrivendo, salvo una Draft in raffinamento o rimasta a metà, che tiene la sua scheda.

## Diagramma (`extension/src/webview/diagram/panel.tsx`, `index.tsx`)
- Nei dettagli, per una Proposal da raffinare, al posto del blocco `Stale` (~362-366) il blocco `To refine: the Model changed since the Proposal was written. Approve refines it first.` con i file cambiati; il suo `Approve` fa come nella Board ed è disabilitato con gli stessi motivi in coda o in raffinamento.
- Nel selettore della Proposal disegnata il segno `⚠ stale` (~202) diventa `to refine`.

## Impostazione e wizard
- `trama.autoUpdateStaleProposals` in `extension/package.json`: booleano, predefinito `false`, titolo `Auto-update Stale Proposals`, descrizione «On: a stale design Proposal shows `to refine`; Approve adapts it to the current Model and then approves it.»
- In `extension/src/host/settings-schema.ts` è una `Checkbox` nel gruppo `Features`, subito dopo `trama.subagentsContextSharing` e prima di `trama.ompChat` (titolo esplicito se serve in `EXPLICIT_TITLES`).
- Nel wizard (`extension/src/webview/wizard/logic.ts`) la chiave sta nel passo `Advanced`, dopo `trama.subagentsContextSharing` e prima di `trama.ompChat`.

Tutti i testi sono in inglese e non seguono `trama.language`.

## Verifica
La logica in `board/logic.ts` (chip, badge, motivi di Approve/Reject, Draft a metà, coda, funzione spenta identica a oggi) è coperta da test `bun:test`.
