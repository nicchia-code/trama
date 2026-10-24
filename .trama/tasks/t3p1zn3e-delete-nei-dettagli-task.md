---
column: done
technical: false
refs:
  - panel
  - requirements/ui#developer.DELETE_TASK
  - requirements/ui#developer.ASK_MORE
  - requirements/tech#panel
  - requirements/rules#panel/Board
drift: null
proposal: zy1af39m
agent: false
created: 2026-10-24T13:45:40.457Z
finished: 2026-10-24T14:05:26.283Z
---
# Delete nei dettagli del Task

Il riferimento è l'intero pannello solo perché le transizioni che portano alla Board restano valide così come sono: il lavoro riguarda soltanto il pulsante `Delete` nella modale dei dettagli di un Task e il suo flusso fino alla cancellazione. La scheda del Task sulla Board non cambia.

La funzione di `src/core` che cancella un Task in To do (ricontrolla le condizioni e cancella il file del Task, il file di percentuale e la cartella delle immagini, lanciando un errore che dice quale condizione non vale) e il dato del quadro che dice, per ogni Task in To do, se un Drift lo trattiene, vengono da un altro Task della stessa Proposal: qui si considerano già presenti, con il dato nella scheda del Task del quadro. Il webview non ricalcola la regola del Drift che trattiene il Task.

## Il pulsante

Quando ciò è fatto, la modale dei dettagli di un Task in To do ha nel piede, all'estremità sinistra e separato da `Ask more` e `Close` (che restano allineati a destra), un `Button` di shadcn/ui nella variante `outline` con l'icona `Trash2` a sinistra del testo `Delete`. Tooltip da abilitato `Delete this Task for good`; nome accessibile `Delete <numero breve>`. Nella modale di un Task In progress o Done il pulsante non c'è. Vale per ogni Task in To do, anche bloccato (badge blocked o waiting) e anche uno tornato in To do dopo un Run interrotto. La modale del corpo di una Proposal ha lo stesso piede, senza `Delete`. Le modali dei dettagli restano da leggere, salvo questo `Delete`: non sono più del tutto di sola lettura.

Quando la cancellazione non è possibile, `Delete` resta visibile ma disabilitato, segnato come tale per le tecnologie assistive, con i motivi nel tooltip e nella descrizione accessibile, in quest'ordine quando ne valgono più d'uno:
1. `The agent is still finishing`: il Task aspetta la fine del turno dell'agente che lo ha archiviato; questo motivo viene sempre prima di ogni altro.
2. `A run is in progress`: un Run lanciato da Trama in questa finestra non è finito (lo stesso testo di `Run all` e di `Clear`).
3. `A Drift needs this Task`: un Drift aperto lo nomina come origine, o il Task è il Task di correzione di un Drift in Code to be fixed (dal dato del quadro).

Le altre attività dell'agente (scan, design, import, risoluzione, unificazione, Ask more, la conversazione General di omp Chat) non disabilitano `Delete`.

## Il messaggio e l'host

Il clic manda all'host `{ type: "deleteTask", task: <identità permanente> }`, un nuovo messaggio del protocollo fra Board e host, validato in `extension/src/host/messages.ts` come `clearDone` (un'identità non valida rende il messaggio non valido). `clearDone` e `deleteTask` sono i soli messaggi che cancellano Task.

L'host, in `extension/src/host/controller.ts`, prima di aprire il dialogo rifiuta la richiesta mentre un Run lanciato da questa finestra non è finito (`A run is in progress`) o mentre il Task aspetta la fine del turno del suo agente (`The agent is still finishing`), mandando alla Board l'avviso descritto sotto. Altrimenti apre un dialogo modale dell'editor con `vscode.window.showWarningMessage` e `modal: true`, come per `Dismiss Drift`: titolo `Delete <numero breve> "<titolo>"?`, dettaglio `The Task is deleted for good and cannot be brought back.`, pulsante `Delete` e l'annullamento dell'editor. `Cancel`, Esc o la chiusura del dialogo non fanno nulla: la modale dei dettagli resta aperta come prima.

Solo con `Delete` l'host ricontrolla, nell'istante della cancellazione, le stesse condizioni (Run in corso, fine del turno) e chiama la funzione di `src/core`, che ricontrolla le condizioni del Task: un Task che nel frattempo è stato preso, spostato o nominato da un Drift non è cancellato. Un rifiuto o un errore (per esempio un file che non si cancella) non cancella nulla e manda alla Board il messaggio `notice` con il testo `Trama could not delete <numero breve>: <motivo>.`, mostrato in cima alla Board con il pulsante di chiusura degli altri avvisi, come i fallimenti di Clear; la modale resta aperta finché il Task è in Active o in Done. In ogni caso poi l'host aggiorna il quadro.

## Dopo la cancellazione

Confermata e riuscita, la cancellazione chiude la modale dei dettagli e la scheda sparisce da Active al quadro successivo; il focus va a `Run all` in fondo ad Active. Nessun avviso di riuscita. Il Task finisce nello stesso stato finale dei Task cancellati con Clear.

Tutti questi testi sono in inglese e non seguono `trama.language`.

## Test

- Webview: il pulsante `Delete` c'è solo nella modale di un Task in To do e non per In progress e Done; i motivi di disabilitazione compaiono nel loro ordine; il clic manda `{ type: "deleteTask", task }`; dopo la cancellazione il focus va su `Run all`.
- Validazione del messaggio `deleteTask` in `extension/src/host/messages.ts` (identità valida accettata, mancante o non valida rifiutata).
- Host con il dialogo finto, come `test/host-dismiss-drift-turn.test.ts`: annullare non cancella nulla; rifiuto prima del dialogo durante un Run o mentre l'agente finisce; rifiuto dopo la conferma con l'avviso `Trama could not delete <numero breve>: <motivo>.`; conferma riuscita che cancella il Task senza avviso.
