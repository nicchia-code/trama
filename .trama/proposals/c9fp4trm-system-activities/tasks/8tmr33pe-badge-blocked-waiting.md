---
technical: false
refs:
  - panel/Board
  - requirements/rules#panel/Board
---

# Badge blocked e waiting

Nella Board la scheda in `Active` di un Task bloccato da uno o più Drift aperti mostra accanto al titolo un solo badge `blocked`, senza numeri, con tooltip e nome accessibile `Blocked by Drift <numeri brevi>` separati da virgole in ordine di creazione dei Drift (per esempio `Blocked by Drift D3, D7`). Un Task che aspetta un Task di correzione mostra il badge `waiting <numero breve>`.

Il badge `blocked` è un pulsante (clic, Invio, Spazio) che apre un `Popover` di shadcn/ui ancorato al badge, titolo `Blocked by`, con una riga pulsante per Drift (numero breve e titolo): la riga chiude il popup, fa scorrere `Backlog` fino alla scheda rossa del Drift, o alla sua riga nella scheda gialla, e le dà il fuoco. Il popup di `waiting` ha titolo `Waiting for`, una riga pulsante per il Task di correzione (pallino, numero breve, titolo) che porta alla sua scheda in `Active` allo stesso modo, e sotto la riga di solo testo `From Drift <identità> <titolo>`. I popup si chiudono con Esc, clic fuori o ripremendo il badge, riportando il fuoco al badge; si aggiornano a ogni nuovo quadro e si chiudono da soli quando il Task non è più bloccato o lascia `Active`.

Il `Run` di un Task bloccato è visibile ma disabilitato, con il motivo `Blocked by Drift <numeri brevi>` o `Waiting for Task <numero breve>` nel tooltip e nella descrizione accessibile, dopo `The agent is still finishing` (che resta primo per una scheda che aspetta il turno del suo agente) e gli altri motivi del `Run`.

Indicazioni: `extension/src/webview/board/cards.tsx` (`BlockedBadge`, `WaitingCardView` da togliere), `extension/src/webview/ui/` per `Popover`; test `test/board-render.test.tsx`.
