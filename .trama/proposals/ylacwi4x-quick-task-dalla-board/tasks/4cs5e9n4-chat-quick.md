---
refs:
  - agent-launching
  - agent-terminal
  - announcement
  - requirements/rules#developer.OPEN_QUICK_TASK
  - requirements/tech#developer.OPEN_QUICK_TASK
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
---
# Chat Quick con omp e Cursor

Quando l'host riceve `openQuickTask`, legge `trama.agent` e apre subito una chat nuova e nuda con l'agente, senza istruzione, senza skill e senza nessuna delle frasi delle altre istruzioni, con il modello del ruolo `trama.execution` (vuoto: il predefinito dell'agente; mai il modello di una Proposal).

Con omp nasce in Agent running un terminale nuovo chiamato `Quick`, nella cartella del progetto e dove dice `trama.terminalLocation`, con le variabili di `terminalEnv` come un design e mai `TRAMA_ADVISOR_SCANNER`. La riga scritta quando la shell è pronta è `omp [--model <m>]`, senza `--hook`, `--config`, `--slow`, `--advisor` e senza prompt; il ruolo si passa esplicito, non da `roleOf`. A differenza degli altri terminali dell'agente si mostra e prende il focus (`terminal.show(false)`, e `preserveFocus: false` nella scheda dell'editor). Il terminale è seguito come gli altri: `terminal.COMMAND_ENDED` e `terminal.CLOSED` lo portano a Closed o Agent idle secondo `trama.autoExit`, e `time.CHECK_DUE` lo chiude quando la sua shell non c'è più; senza hook nessun `agent-hook.IDLE` lo chiude. Al lancio Trama annuncia un lavoro `Quick` (`announcement` in Al lavoro), che finisce senza avvisi quando omp esce, il terminale si chiude o il controllo di esecuzione lo chiude. Il Quick Task non registra nessun `JobKind`: non è un Run, non conta per `trama.submitWhileRunning`, per l'esclusione fra Run e Resolve Drifts né per i motivi dei pulsanti, e non è mai rifiutato. Le schede che l'agente vi consegna appartengono al terminale e non aspettano la fine del turno.

Con la chat di Cursor l'host chiama soltanto `composer.createNew` con `{ partialState: { unifiedMode: "agent", modelConfig? }, openInNewTab: true }`, senza testo e senza `autoSubmit`, e non avvia lavori né annunci, così nessuna conversazione si lega al Quick Task. Se il comando fallisce compare l'errore `Trama: could not open a new Cursor chat.`, senza deeplink né appunti. In un editor che non è Cursor non si apre nulla e compare l'avviso `Trama: Cursor's chat is only available in Cursor. Choose omp in Trama's Settings to open a Quick Task in a terminal.` con `Open Settings`; gli appunti non cambiano. Va verificato con Cursor 3.23.12 che la conversazione nuova prenda il focus nel campo del messaggio.

Aggiornare `README.md`, `docs/` e `CHANGELOG.md` dove descrivono come si avvia l'agente dalla Board.
