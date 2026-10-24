---
technical: false
refs:
  - developer.CLEAR_DONE
---
# Clear di Done

Oggi `Clear` in fondo alla colonna Done non cancella nulla. La Board (`extension/src/webview/board/index.tsx`) manda all'host `{ type: "clearDone", tasks }`, previsto in `ToHost` di `extension/src/protocol.ts`, ma `parseToHost` in `extension/src/host/messages.ts` non ha un `case "clearDone"`: l'host scrive `Ignored an invalid message from the view: unknown message type "clearDone"` e scarta il messaggio. Il controller (`extension/src/host/controller.ts`) e `clearDoneTasks` in `src/core/clear-done.ts` lo gestiscono già.

Quando è fatto:
- `parseToHost` accetta `clearDone` solo con `tasks` come array di identità permanenti di Task (stringhe); ogni altra forma è rifiutata come messaggio non valido, come per gli altri tipi. Il messaggio accettato arriva al controller.
- Il clic su `Clear` cancella per sempre, senza conferma e senza avviso di riuscita, ogni Task che la colonna Done mostrava al clic, chiuso senza modifiche compreso, tranne quelli nominati da un Drift aperto (non risolto, non dismesso, non unito) come origine o come Task di correzione, che restano con il badge `kept`; un Task che nel frattempo ha lasciato Done non è cancellato. Prima di cancellarlo Trama scrive la sua copia (titolo, tag della Proposal, istante di arrivo in Done, riferimenti) in ogni voce di History che lo cita; un Task che non riesce a copiare non è cancellato. Le schede spariscono al quadro successivo e le finestre dei dettagli di un Task cancellato si chiudono.
- Mentre un Run lanciato da Trama non è finito l'host rifiuta la richiesta con il motivo `A run is in progress`, senza cancellare nulla. Se la cancellazione fallisce un avviso in cima alla Board ne dice il motivo e i Task non cancellati restano.
- `test/host-messages.test.ts` ha un caso che prova che `clearDone` con un array di identità è accettato così com'è e che `tasks` mancante o non fatto di stringhe è rifiutato.
