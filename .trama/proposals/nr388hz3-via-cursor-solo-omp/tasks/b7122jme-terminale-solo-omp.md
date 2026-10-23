---
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
  - requirements/quality#agent-terminal
---
# Istruzioni solo a omp

Ogni istruzione (design, scan, import, implement, implement all, Resolve Drifts, Unify Drifts, Quick Task, Ask more) va sempre a omp: in un terminale integrato nuovo, secondo `trama.terminalLocation`, oppure in una conversazione nuova di omp Chat quando omp Chat è in uso. Non esiste più alcuna scelta dell'agente né alcun percorso verso la chat di Cursor, in nessun editor.

Da rimuovere:
- L'impostazione `trama.agent` dal manifest (`extension/package.json`) e ogni codice che ne calcola un agente effettivo per il lancio: `configuredAgent` e `agentName` in `extension/src/host/agent.ts` (e i loro usi in `main.ts`, `QuestionSession`, `omp-chat/view.ts`). Un valore rimasto nelle impostazioni utente, `cursor` compreso, non si legge e non si cancella, senza avvisi. Le parti di `trama.agent` che toccano Settings, wizard, modelli delle Proposal e Board appartengono ad altri Task.
- La catena di consegna alla chat di Cursor: in `agent.ts` `openChat`, il ramo `agent === "cursor"` di `launchAgent` (consegna, `inSendTurn` legato all'invio, avvio del lavoro al momento dell'invio e sua ripresa), le varianti Cursor di `openQuickTask` e di Ask more; in `extension/src/host/cursor.ts` `isCursor`, `withTramaPath`, `withAskLine`, `openCursorChat`, `deeplinkAccepts`, `toClipboard` e il tipo `ChatDelivery` (restano i programmi inclusi usati da omp: `bundledTrama`, `bundledOmpHook`, `bundledUnifyInstructions`, `bundledAskMoreInstructions`).
- Gli avvisi «Trama: Cursor's chat is only available in Cursor…» (con `Open Settings`), sia per le istruzioni sia per Quick Task e Ask more, e la messa negli appunti fuori da Cursor.
- La riga del `PATH` per la chat e il parametro `askOwnLine` di `agentPrompt`: la frase `Ask the developer only with \`trama question new\`…` sta sempre sulla stessa riga dell'istruzione, dopo la frase del Drift blocker e prima di quella della lingua. Ask more porta solo la frase della lingua.
- Ogni lettura di `vscode.env.appName` per riconoscere l'editor: nessun controllo rifiuta un editor derivato da VS Code.

Da cambiare: il comando scritto nel terminale è `<omp> --hook <modulo> <istruzione>`, e quello del Quick Task `<omp>` con il solo `--model` eventuale, dove `<omp>` è lo stesso programma omp che Trama usa per tutto il resto: `trama.ompPath` (senza spazi ai bordi) quando non è vuoto, altrimenti `omp` dal PATH dell'editor, citato per la shell come gli altri argomenti (`agentTemplate` e `quickCommandLine` in `extension/src/host/terminal-agent.ts` oggi scrivono un `omp` letterale). `trama.ompPath` si legge solo dalle impostazioni utente, così un repository clonato non può cambiare il programma eseguito. La descrizione di `trama.ompPath` nel manifest diventa «Path of the `omp` program Trama runs for every agent, the model list and the checks. Empty uses `omp` from the editor's PATH.» e quella di `trama.ignoreInstructionFiles` perde il «With omp:» iniziale.

Documenti: `README.md` e `docs/uat.md` dicono che l'unico agente supportato è omp e l'unico editor VS Code con l'estensione di Trama; spariscono le righe su Cursor, la sua chat, le versioni di Cursor provate e l'Agents Window, salvo le citazioni sui file di istruzioni di Cursor che omp legge.

Test: eliminare quelli della consegna alla chat di Cursor, dell'avviso fuori da Cursor, di `configuredAgent`/`agentName` e della riga del `PATH`; aggiornare quelli delle righe di comando del terminale e del Quick Task perché usino il programma omp configurato e citato, e quelli di `agentPrompt` con la frase delle domande sempre sulla stessa riga.
