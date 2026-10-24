---
status: approved
base:
  actors/developer.md: 0f999d97e5d7720105a794726a67ec1398ae35824401c22285e895ac9d5435e4
  editor-panel/panel.md: 6d03712fbf8065c74769fade0c4ef9486d3db99c34322de32dbc16b1c2f12584
  editor-panel/focus.md: 433355ae4101568d250136d79e2558d07a17f8d2d31fa5824f0511b0fe46ecb2
  requirements/ui/board.md: d92787ed93ca1edd125e9d2a85882eb7dfe0968355faa29639aa6b034fe22222
  requirements/ui/ask-more.md: 36cea0153e82a691be4ce0adf719aa9d0cc0a7269e3448c1f98b145a07bc78ea
  requirements/ui/history.md: 27d7960f2566717627b7a55c27f9dcbcbb8783346af7df6ca11f796e2470f23b
delete: []
request: 2026-10-24T15-18-12
created: 2026-10-24T13:21:58.201Z
label: Schede senza chip
---
# Schede senza chip

La richiesta scritta chiede di togliere dalla Board i chip blu dei riferimenti: oggi la scheda di un Task in Active mostra una riga di chip, uno per riferimento (elementi del Modello, sezioni dei Requisiti, Specs), che la affollano. I pulsanti View on diagram e View requirements restano sulla scheda e la finestra dei dettagli del Task mostra ancora tutti i riferimenti.

## Decisioni

- Dalla scheda di un Task in Active spariscono tutti i chip dei riferimenti (elementi del Modello, Requisiti e Specs): la scheda non ha più la riga dei chip, come quella di un Task in Done.
- I chip restano dove sono nelle finestre: dettagli di un Task (anche Done), dettagli di un Drift e Task dei dettagli di una voce di History.
- Il badge `technical` compare sulla scheda di ogni Task tecnico, perché la scheda non mostra più nessun chip (prima compariva solo per un Task tecnico senza riferimenti).
- Il Modello si allinea a Requisiti e codice anche sui Drift: i chip di un Drift stanno nella finestra dei suoi dettagli, non sulla sua scheda.
- L'immagine della richiesta non va ai Task.

## Raffinamento

- Il frammento `ui/history` è riscritto sul testo attuale: la sezione `developer.CLEAR_DONE`, cambiata da un'altra Proposal approvata (schede nascoste subito al clic, Clear rifiutato durante un Run), resta com'è ora; questa Proposal cambia solo la riga della scheda di un Task Done in `task/Done`.

## Already present

- `focus` — `extension/src/webview/board/dialogs.tsx` `TaskDetailsDialog` e `DriftDetailsDialog`, `extension/src/webview/board/history.tsx`: i chip (`RefChips`, `extension/src/webview/board/parts.tsx`) stanno già nei dettagli; `DriftCardView` in `extension/src/webview/board/cards.tsx` non ha chip
- `requirements/ui#developer.ASK_MORE` — `extension/src/webview/board/dialogs.tsx` `TaskDetailsDialog` usa `RefChips`, con gli stessi tooltip dei dettagli di un Drift
- `requirements/ui#task/Done` — `extension/src/webview/board/cards.tsx` `DoneCardView` non ha chip
- `panel/Closed/developer.SHOW_BOARD` — `extension/src/host/main.ts` comandi `SHOW_COMMANDS` (`extension/src/menu-protocol.ts`) → `trama.show`
- `panel/Open/developer.SHOW_BOARD` — `extension/src/host/main.ts` comandi `SHOW_COMMANDS` → `trama.show`
- `panel/Closed/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`
- `panel/Open/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`
- `panel/Settings/developer.CONFIRM_SETUP` — `extension/src/host/controller.ts` `confirmSetup`
- `panel/Settings/developer.CANCEL_SETUP` — `extension/src/webview/wizard/controller.ts`
- `panel/Get Started/developer.INITIALIZE_PROJECT` — `extension/src/host/controller.ts` `confirmSetup` → `initializeProject` (`extension/src/host/project.ts`)
- `panel/Get Started/workspace.MODEL_CHANGED` — `extension/src/host/controller.ts`
- `panel/Open/developer.FOCUS_REF` — `extension/src/webview/board/parts.tsx` `RefChips` (navigazione con focus `ref`), usato dalle modali dei dettagli
