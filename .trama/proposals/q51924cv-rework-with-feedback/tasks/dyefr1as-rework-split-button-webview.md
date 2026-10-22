---
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel
  - drift
  - drift/Open/developer.FIX_DRIFT_CODE
---
# Freccetta Rework nel pannello

Quando il Task è finito, nel webview `Reject` e `Dismiss Drift` sono pulsanti divisi con la voce `Rework with feedback…`, sulla Board e nei dettagli del Diagramma.

## Pulsante diviso
- Un solo componente del webview, usato per entrambi: due `Button` di shadcn/ui uniti come il pulsante diviso di `+ Add Work Item` (in `extension/src/webview/board/index.tsx`), più il `DropdownMenu` di `extension/src/webview/ui/dropdown-menu.tsx` con `side="bottom"`. Nessuna libreria nuova.
- A sinistra il pulsante di sempre (`Reject` con icona `X` e la sua variante; `Dismiss Drift` con icona `Ban`). A destra, stretta e unita, la freccetta a sola icona `ChevronDown`. Il menu, aperto con clic o da tastiera, ha una sola voce `Rework with feedback…`, senza icona; non ripete il pulsante principale.
- Per una Proposal: tooltip e nome accessibile della freccetta `More ways to reject <numero breve>`; tooltip della voce `Reject it and have the agent redo it with your feedback`. Vale sulla scheda Backlog di ogni Proposal (ordinaria, di setup, di import, gialla di risoluzione) e nei dettagli di una Proposal nel Diagramma (`extension/src/webview/diagram/panel.tsx`), dove senza numero breve si usa l'identità permanente. La voce manda all'host `reworkProposal { proposal }`.
- Per un Drift: sulla scheda rossa in Backlog e nei dettagli del Drift nel Diagramma; tooltip e nome accessibile `More ways to handle <numero breve>`; tooltip della voce `Have the agent resolve this Drift following your feedback`. La voce manda `reworkDrift { drift }`.
- Testi in inglese, non seguono `trama.language`.

## Disabilitazione
- La freccetta è disabilitata (anche per le tecnologie assistive, `aria-disabled`/`disabled`) quando lo è il pulsante accanto, con gli stessi motivi nello stesso ordine (`The agent is still finishing` prima di ogni altro).
- Per una risoluzione gialla, e per un Drift, è disabilitata anche quando `Resolve` non partirebbe, aggiungendo dopo i motivi di `Resolve` (`Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision`). La logica dei motivi sta in `extension/src/webview/board/logic.ts`, riusando quella esistente di Reject, Dismiss Drift e Resolve.

## Reject senza feedback
- `Reject` da solo non chiede più feedback lato webview: manda il messaggio di rifiuto come prima; la casella del feedback non c'è più nel suo percorso (l'host rifiuta subito; la parte host è di un altro Task).

## Conseguenze sui Drift
- Un Drift risolto con Rework dalla scheda rossa resta aperto e la sua scheda è segnata `Resolving` come dopo `Resolve`, finché l'agente lavora.
- Rifiutare una risoluzione gialla con Rework la toglie dalla Board come un rifiuto: i Drift ancora aperti riprendono la scheda rossa finché la nuova risoluzione è in scrittura, poi entrano nella nuova scheda gialla quando è consegnata. Il webview non ha logica nuova per questo oltre a mostrare correttamente lo stato che l'host manda.
- Il Board resta in sola lettura per i Task: la sola azione nuova è far rifare una Proposal o far risolvere un Drift con Rework with feedback.

Codice coinvolto: `extension/src/webview/board/cards.tsx` (pulsanti Reject e Dismiss Drift delle schede), `extension/src/webview/board/logic.ts`, `extension/src/webview/diagram/panel.tsx` (dettagli Proposal e Drift), il tipo dei messaggi webview→host condiviso con `extension/src/host/messages.ts` (aggiungere `reworkProposal` e `reworkDrift`).
