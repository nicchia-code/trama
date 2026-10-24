---
technical: false
refs:
  - proposal/Open
  - proposal/Draft/developer.APPROVE_PROPOSAL
  - raffinamento
  - requirements/rules#proposal
  - requirements/rules#raffinamento
  - requirements/ui#raffinamento
---
# Approve fermo nei Run

Dal pannello nessuna Proposal si approva mentre un Run lanciato da questa finestra è in corso, e un raffinamento che finisce durante un Run aspetta la fine del Run per approvare.

Quando è fatto:
- Il pulsante `Approve` di una Proposal, sulla Board e nei dettagli del Diagramma, è disattivato con il motivo `A run is in progress` (lo stesso testo di Clear, `RUN_IN_PROGRESS`) finché un Run lanciato da questa finestra non è finito; una sequenza per modello conta come un solo Run. Vale anche per una Proposal da raffinare e per una Draft rimasta a metà di un raffinamento. Il motivo viene dopo `The agent is still finishing` e prima degli altri motivi del pulsante. Il pulsante torna disponibile da solo alla fine del Run.
- L'host (`extension/src/host/controller.ts`, `case "approveProposal"`) rifiuta con lo stesso motivo, senza cambiare nulla, un messaggio di approvazione che arriva mentre un Run della finestra è in corso (`ownWindowRuns`), prima di mettere in coda un raffinamento o di approvare.
- Alla fine di un raffinamento (`endRefinement`), se la Proposal è consegnata, `open` e non bloccata ma un Run della finestra è in corso, l'host non la approva: la ricorda in memoria e la scheda ha il badge `waiting for the run` con tooltip e nome accessibile `Refined; Trama approves it when the run in progress ends`, `Approve` disattivato con `A run is in progress` e `Reject` abilitato. Quando il lavoro di tipo Run della finestra finisce, l'host guarda di nuovo ogni Proposal che aspettava con le regole di fine raffinamento: la approva con `approveProposal` se è ancora `open`, non obsoleta e non bloccata; la rimette in coda se è di nuovo obsoleta; la lascia Open con i suoi motivi se è bloccata per altro. Riaprire l'editor dimentica l'attesa.
- Il quadro per il webview porta le Proposal che aspettano il Run accanto a `refinement`, e il motivo del Run per `Approve`; la logica dei motivi sta nelle funzioni pure del webview (`approveBlocker`, `refineApproveBlocker`) con test `bun:test`.
- La riga di comando non cambia: `trama proposal move <id> approved` e `trama drift move <id> proposal-accepted` non conoscono i Run della finestra.
- Test dell'host: Approve rifiutato durante un Run e accettato dopo; un raffinamento finito durante un Run che aspetta e viene approvato alla fine; uno che alla fine del Run è di nuovo obsoleto e rientra in coda.
- `extension/README.md` e `CHANGELOG.md` descrivono il blocco.
