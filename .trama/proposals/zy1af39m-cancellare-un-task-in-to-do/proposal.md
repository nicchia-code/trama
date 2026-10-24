---
status: approved
base:
  work/task.md: f07e95c9c5e6d4f7c9e7a8c719a711970cfcb55b53695cae886901ac35aa7bf3
  actors/developer.md: a4269fa208ec9bc3da0ea3d7f56e7c38d479ffd9c3f3a280705247b977802e6d
  actors/agent.md: ebdf554369838d996220f2f65b079ad0031236789d04243d80ef6b7d5f64edec
  editor-panel/panel.md: 1a864c00af6c66046d07f17d00209b92633a522f04907439ab9bc7986e82581a
  requirements/rules/tasks.md: 3760a81f3d67c52368ff088cf3031193f1da17c667af7a961ebaab716f377503
  requirements/rules/turn-history.md: 480461e5587a92bff60184771950423eff4b10cb6b6c452b7887b74ddc1107cd
  requirements/rules/general.md: e1f828d60133387330d8a4e991b3f9f591a7dac707196593be857bc5ccb6918f
  requirements/tech/history.md: 041d1b20042ed23d1c1cd345b03bf705d8f8c689e37424b256e7dfa0b10b75d0
  requirements/ui/board.md: 03737c4bb73a819dfd5f1b37be11c602bd8c8618f66416a664f359e2715c0560
  requirements/ui/ask-more.md: 9f793908be92c3e6f6b713ae18e0fcbceba2fae63f2842309fbc7aa09b7b42a5
  requirements/data/history.md: be9ab63c46587a58dd759585388d06d64314c2c72b572b811883ba24023c4539
  requirements/cli/main.md: 2b8c433435e46f92332ce33811c874e0b46b8ccc0cc25faf7a9f6b59a381ca5a
  requirements/tech/panel.md: 059b2e9568afd1068897b1d6547848c78723d621a97b69bcf5ac9876f44e50df
  requirements/ui/history.md: 9ad09b79717a0e8cea1d461861020ed15f520edb802d09af8345b39cd9f724ee
delete: []
request: 2026-10-24T15-21-48
created: 2026-10-24T13:33:12.269Z
label: Cancella Task
---
# Cancellare un Task in To do

Il developer vuole poter togliere per sempre un Task non ancora partito, con una conferma in un dialogo modale, invece di aspettare che finisca in Done per cancellarlo con Clear.

## Decisioni

- Si cancella ogni Task in To do: Trama non ricorda se un Task è mai partito, quindi vale anche un Task tornato in To do dopo un Run interrotto. In progress e Done non si cancellano così.
- Dal pannello la cancellazione parte dalla modale dei dettagli del Task: un pulsante `Delete` outline con l'icona `Trash2` all'estremità sinistra del piede, lontano da `Ask more` e `Close`. La scheda del Task non cambia.
- Il pulsante c'è per ogni Task in To do; è disabilitato, con il motivo nel tooltip, quando la cancellazione non è possibile; manca per i Task In progress e Done.
- La conferma è un dialogo modale dell'editor, come Dismiss Drift: titolo `Delete <Tn> "<titolo>"?`, dettaglio `The Task is deleted for good and cannot be brought back.`, pulsante `Delete` e l'annullamento dell'editor.
- Un Task bloccato (badge blocked o waiting) si cancella come gli altri.
- Un Task che un Drift aperto nomina come origine non si cancella, come per Clear; non si cancella nemmeno il Task di correzione di un Drift in Code to be fixed, così la correzione decisa non si perde e le origini continuano ad aspettarla.
- Dal pannello la cancellazione è indisponibile mentre un Run lanciato da Trama non è finito e mentre l'agente che ha archiviato il Task finisce il suo turno.
- Dopo la conferma la modale dei dettagli si chiude, la scheda sparisce al quadro successivo e il focus va a `Run all`; nessun avviso di riuscita.
- Esiste anche il comando `trama task delete <id>`: controlla solo il Task (in To do, nessun Drift che lo trattiene), non il Run in corso né la fine del turno, e cancella subito, senza conferma.
- L'agente può eseguire il comando, ma le skill gli dicono di farlo solo quando il developer glielo chiede esplicitamente nella conversazione, come le altre decisioni del developer.
- Nel Modello il Task cancellato va nello stesso stato finale Cleared dei Task cancellati con Clear.
- La cancellazione non lascia traccia: nessuna copia nelle voci di History che lo citavano (mostrano che il Task non esiste più), nessuna voce nuova; spariscono il file del Task, il file di percentuale e la cartella delle immagini.

## Assunzioni dell'agente

- Il motivo del pulsante disabilitato per un Task trattenuto da un Drift è `A Drift needs this Task`; gli altri motivi sono quelli già usati: `The agent is still finishing`, sempre per primo, e `A run is in progress`. Il tooltip da abilitato è `Delete this Task for good`.
- Una cancellazione rifiutata dopo la conferma (il Task è cambiato nel frattempo) o fallita mostra un avviso in cima alla Board, `Trama could not delete <Tn>: <motivo>.`, come i fallimenti di Clear.
- Il comando stampa `Deleted Task <id> "<titolo>".`; un rifiuto è un errore che dice perché, senza cancellare nulla. `delete` diventa un verbo della riga di comando valido solo per `task`.
- Il numero breve del Task cancellato torna libero; il design della sua Proposal continua con i Task rimasti, con le regole di sempre dei numeri brevi.

## Raffinamento

- `actors/developer.md`: l'Event `FOCUS_REF` resta come nel Modello attuale (le schede della Board non hanno chip dei riferimenti); la Proposal aggiunge solo `DELETE_TASK`.
- `editor-panel/panel.md`: la scheda Settings resta come nel Modello attuale; la Proposal cambia solo la Board (finestra dei dettagli, attesa della fine del turno, pulsanti che tolgono schede) e aggiunge la Transition `developer.DELETE_TASK`.
- `requirements/tech/history.md`: restano la lettura unica della funzione di Clear e la rimozione ottimistica di Clear (`clearDoneEnded`) già approvate; la sezione `developer.DELETE_TASK` si aggiunge dopo di esse.
- `requirements/ui/ask-more.md`: i chip della modale dei dettagli di un Task restano descritti come quelli dei dettagli di un Drift, come nel Requisito attuale; la Proposal cambia solo il piede e aggiunge la sezione `developer.DELETE_TASK`.
- `requirements/ui/board.md` e `requirements/ui/history.md` restano come sono ora: la Proposal non li cambiava, e la sua copia avrebbe tolto le schede senza chip e la rimozione ottimistica di Clear.
