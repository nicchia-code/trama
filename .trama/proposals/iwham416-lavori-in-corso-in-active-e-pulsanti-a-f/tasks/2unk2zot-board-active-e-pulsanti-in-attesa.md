---
technical: false
refs:
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel/Board
---
# Active con ogni lavoro in corso e pulsanti in attesa del turno nella Board

Quando il Task è finito, la Board mostrata con `SHOW_BOARD` dice sempre tutto ciò che è in corso e segna le schede che aspettano la fine del turno del loro agente.

- Active disegna il ghost di ogni lavoro lanciato da Trama, con qualunque agente, dal momento in cui l'istruzione parte: il ghost della Proposal di un design; il ghost della risoluzione per Resolve Drifts (con `Resolve all` o `Resolve`), che dice quali Drift sono in risoluzione mentre le loro schede restano in Blocked segnate come in risoluzione; il ghost del controllo di uno scan; il ghost del lavoro di un import, che sparisce senza avvisi quando l'agente finisce. Un Run si vede soltanto dalle schede dei suoi Task presi dall'agente e dai ghost dei suoi controlli. I ghost non si cliccano e non contano come schede.
- Per ogni scheda il cui ID è nell'elenco delle schede in attesa portato dal quadro, i pulsanti `Approve` e `Reject` della Proposal, `Resolve` e `Dismiss Drift` del Drift e il `Run` del Task restano visibili ma disabilitati, segnati come tali per le tecnologie assistive, con il motivo `The agent is still finishing` nel tooltip e nella descrizione accessibile, prima degli altri motivi calcolati da `src/core`. Lo stesso vale per `Approve`, `Reject` e `Dismiss Drift` nei dettagli del Diagramma.
- Quando arriva il nuovo quadro senza la scheda nell'elenco, i pulsanti si abilitano da soli, senza azioni del developer e senza spostare il focus. La scheda in attesa non ha altri segni: nessun badge, nessun bordo, nessun ghost in più. `Run all`, `Resolve all` e `+ Add Work Item` non cambiano.

Aggiornare i test del webview su ordine dei motivi, stato accessibile e riabilitazione.
