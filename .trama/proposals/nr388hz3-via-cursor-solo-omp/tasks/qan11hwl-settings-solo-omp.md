---
technical: true
refs:
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
  - requirements/quality#panel/Settings
---
# Settings con soli modelli omp

La scheda Settings del pannello non conosce più un agente da scegliere: omp è l'unico agente e l'unica fonte dei modelli.

Quando è fatto vale:
- Gruppi e ordine: `Appearance` (`trama.theme`), `Agent` (`trama.ompPath`, `trama.terminalLocation`, `trama.ignoreInstructionFiles`, `trama.autoExit`, `trama.language`), `Models` (`trama.analysis`, `trama.scan`, `trama.execution`, `trama.maxParallelAgents`), `Project` (`trama.skillsDir`), `Features` (`trama.driftBlocker`, `trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`, `trama.ompChat`, `trama.ompChatApproval`). `trama.agent` non compare: via da `SETTING_GROUPS`, `AGENT_KEY` e `shownAgentValue` in `extension/src/host/settings-schema.ts` e la prop `agent` di `extension/src/webview/settings/index.tsx`. Un valore utente rimasto di `trama.agent` non si legge né si cancella. `trama.ompPath` è il primo di Agent e la sua descrizione dice che è il programma omp che Trama usa per tutto. `trama.ignoreInstructionFiles` si vede sempre.
- `trama.ompChat` è accesa per default (l'unica funzione di Features accesa finché il developer non la spegne), con la descrizione «On (the default): Trama's jobs open a conversation in the omp Chat view instead of a terminal. How omp asks for permission there is set by omp Chat Approval.»; il suo controllo è sempre attivo, senza la nota «Only with omp» né il rifiuto di `OMP_CHAT_KEY` legato all'agente.
- Subito dopo c'è `trama.ompChatApproval`, titolo `omp Chat Approval`, un `Select` con `ask` (default) e `yolo`, e la descrizione «How omp approves commands in omp Chat conversations: `ask` (the default) asks you in the conversation, as omp does in the terminal; `yolo` runs every command without asking.». Qui va solo il controllo della scheda (schema e voce in Features); manifest e uso del valore sono di omp Chat.
- `trama.advisorScanner`: la descrizione resta, il controllo è sempre attivo, senza riferimenti a `trama.agent`; l'aiuto dell'host che dice se è attivo non guarda `configuredAgent()`.
- Suggerimenti dei modelli: la sola fonte è `omp models --json` (`ompModels`/`parseOmpModels` in `extension/src/host/model-lists.ts`), avviato senza shell con il programma omp di Trama, scadenza 15 s, PATH con in testa la cartella di `trama.ompPath` o di bun. Si cancellano `CURSOR_STATE_KEY`, `parseCursorModels` e `cursorModels` di `model-lists.ts` e il ramo per agente/`appName` di `postModelSuggestions`/`modelList` in `extension/src/host/controller.ts`. L'elenco si ricalcola quando la vista Settings diventa visibile e a ogni cambio di `trama.ompPath`; sparisce il trigger `vscode.lm.onDidChangeChatModels` in `extension/src/host/main.ts` e quello su `trama.agent`. La riga d'errore sotto i tre campi dei ruoli si mostra sempre quando l'host manda `error` e sparisce con un elenco senza errore, senza più la condizione su `trama.agent`. Le voci della Combobox sono i modelli che omp dichiara, nell'ordine di omp.
- Sicurezza (`quality#panel/Settings`): l'estensione non apre nessun file di Cursor; nessuna chiamata di rete; un motivo d'errore è un testo fisso, mai l'output di omp. Non c'è più lo smoke test di compatibilità su `availableDefaultModels2`.

Test: cancellare i test del lettore del database di Cursor (`state.vscdb`); restano quelli del parser dell'uscita di omp. Aggiornare quelli di `settings-schema` (gruppi senza `trama.agent`, `trama.ompChatApproval` dopo `trama.ompChat`, omp Chat non più rifiutata) e dei messaggi dell'host sui suggerimenti.
