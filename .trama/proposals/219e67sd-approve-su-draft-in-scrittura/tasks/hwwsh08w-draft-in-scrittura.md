---
technical: false
refs:
  - raffinamento
  - proposal/Draft
  - requirements/rules#raffinamento
  - requirements/ui#raffinamento
  - requirements/tech#raffinamento
---

# Draft in scrittura non decidibile

Oggi sulla Board e nei dettagli del Diagramma si può cliccare `Approve` o `Reject` su una Proposal ancora Draft (in preparazione) e solo dopo il clic compare l'errore. I pulsanti devono invece essere disabilitati prima del clic, con il motivo.

## Cosa deve valere alla fine

**Draft in scrittura.** Una Draft con `refining: true` è "in scrittura" quando un raffinamento di questa finestra la sta scrivendo, oppure quando un annuncio vivo (né consegnato né ritirato, `rules#announcement`) è legato a lei (`Announcement.proposal`, `src/core/announcements.ts`), qualunque terminale, finestra o lancio lo abbia prodotto: un'altra finestra, un agente avviato prima di riaprire l'editor, un raffinamento lanciato a mano. Vale con Auto-update Stale Proposals (`trama.autoUpdateStaleProposals`) acceso o spento. Una Draft in scrittura non è mai da raffinare: `Approve` e `Refine All` non la mettono mai in coda. Quando l'annuncio è consegnato o ritirato, al quadro successivo torna una Draft rimasta a metà, `to refine`, e (con la funzione accesa) `Approve` riprende il raffinamento.

**Quadro della Board.** `src/core/snapshot.ts` (oggi `:431` tiene solo `open` o `draft && refining` quando serve) costruisce un `ProposalView` per ogni Draft con `refining: true`, con il campo `refining` e il campo nuovo `writer`: `{ phase, note }` dell'annuncio vivo legato a quella Draft (la stessa fase e ultima nota che mostrerebbe un ghost, `ui#announcement`), oppure `null` se nessuno è legato. L'annuncio legato a una Proposal che ha una scheda continua a non avere ghost proprio (`snapshot.ts:434-436`). Il webview disegna questa Draft con la funzione accesa o spenta.

**Scheda "in refining elsewhere".** Una Draft con `writer` non `null` (anche se la coda di questa finestra non l'ha lanciata) ha la stessa scheda di una Proposal in raffinamento, con o senza la funzione: badge `refining` (tooltip `The agent is refining this Proposal on the current Model`), bordo animato, riga di fase (`Refining`, oppure `Waiting for your answers` mentre il round di quell'agente è aperto) e ultima nota dell'agente, entrambe da `writer`; `Approve`, `Reject` e la freccetta di Rework disabilitati con il motivo `The agent is refining this Proposal`. Nessun `Cancel`, perché il lavoro non è nella coda della finestra. Oggi `refineStatus` (`extension/src/webview/board/logic.ts:395`) dà null con la funzione spenta e `refinePhase` (`logic.ts:474`) vale solo per `refine === "running"`: vanno estesi.

**Funzione spenta, Draft a metà che nessuno scrive.** La scheda resta al suo posto con il chip `to refine`, tooltip e nome accessibile `Refining stopped before the hand-over. Turn on Auto-update Stale Proposals to resume it.`; `Approve`, `Reject` e la freccetta sono visibili ma disabilitati, segnati così per le tecnologie assistive, con il motivo `Still being written. Turn on Auto-update Stale Proposals to resume refining` nel tooltip e nella descrizione accessibile. Non conta fra ciò che aspetta una decisione.

**Ordine dei motivi.** I due motivi nuovi (`The agent is refining this Proposal`, `Still being written. Turn on Auto-update Stale Proposals to resume refining`) vengono subito dopo `The agent is still finishing` e prima di `A run is in progress` (`RUN_IN_PROGRESS`, `src/core/design.ts`) e di ogni altro motivo dello stesso pulsante, sulla Board e nel Diagramma (`joinReasons`).

**Diagramma.** In `ProposalBlock` (`extension/src/webview/diagram/panel.tsx`) una Draft a metà con la funzione spenta, o una Draft in scrittura da qualunque agente, ha `Approve`, `Reject` e freccetta disabilitati con gli stessi motivi, nello stesso ordine, della sua scheda. I motivi per una Draft si calcolano una sola volta in `logic.ts` (accanto a `approveBlocker`, `refineApproveBlocker`, `finishingBlocker`) e li usano sia `proposalCard` sia `ProposalBlock`.

**Host.** In `extension/src/host/refinement.ts`, `refinable` riceve `writing` true per una Draft il cui `writer` non è `null` o che un raffinamento di questa finestra sta eseguendo (oggi `refinableNow` in `controller.ts` passa sempre `writing = false`), così `approveProposal` e `refineAll` non la mettono mai in coda. Con la funzione spenta, o per una Draft in scrittura, i messaggi `approveProposal`, `rejectProposal` e Rework with feedback su una Draft che arrivano comunque all'host (il pannello non si era ancora ridisegnato) non vanno in coda: proseguono verso `src/core`, che li rifiuta con `requireStatus` ("still being written", `src/core/proposals.ts`), mostrato nel banner di errore in cima al pannello come oggi.

**Modello.** `developer.APPROVE_PROPOSAL` → Draft vale solo con Auto-update Stale Proposals acceso, su una Draft rimasta a metà che nessun agente scrive (nemmeno uno che questa finestra non ha lanciato), e solo quando nessun Run lanciato da questa finestra è in corso: non approva, non cambia file, riprende o mette in coda il raffinamento.

**Note.** Se il progetto descrive in `extension/README.md` / `CHANGELOG.md` il comportamento della Board, una riga nota il cambiamento.
