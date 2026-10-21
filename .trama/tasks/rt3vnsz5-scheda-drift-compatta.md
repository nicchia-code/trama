---
column: done
technical: true
refs:
  - requirements/ui#panel
  - requirements/tech#panel
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:52:53.705Z
---
# Scheda Drift compatta e icone

Sulla Board (`panel/Board`) la scheda rossa di un Drift in `Backlog` è compatta: tiene il bordo sinistro rosso e, chiusa, mostra soltanto il numero breve, il titolo e i badge `recurring` e `Resolving`, con sotto i pulsanti `Resolve` e `Dismiss Drift` sempre visibili. Il badge `Critical` non c'è più. Il toggle `Show details` (icona `ChevronDown`) apre nella scheda i chip dei riferimenti, i due lati e la riga `Not blocking`, e diventa `Hide details` (icona `ChevronUp`). La scheda è chiusa quando il pannello si apre e resta come il developer l'ha lasciata mentre la Board si aggiorna nella sessione.

Nelle schede gialle di risoluzione le righe dei Drift non hanno più sotto le righe dei Task che bloccano.

Ogni pulsante con testo della Board ha la sua icona lucide (da `lucide-react`) a sinistra del testo, secondo l'elenco di `ui#panel`; l'icona `link` di «Also blocked by» sparisce, e non resta nessuna icona per `Resolve all`. I badge `blocked` e `waiting` non hanno icona.

Indicazioni: `extension/src/webview/board/cards.tsx` (`DriftCardView`, `TaskRow`), `board/parts.tsx`, `diagram/panel.tsx` (`CriticalBadge`); test `test/board-render.test.tsx`.
