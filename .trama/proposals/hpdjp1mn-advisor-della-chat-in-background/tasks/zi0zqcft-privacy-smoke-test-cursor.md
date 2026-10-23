---
refs:
  - editor-chat.TOOL_FINISHED
  - requirements/quality#editor-chat
---
# Smoke test dei round Cursor

L'Advisor della chat di Cursor (Machine `chat-advisor`) ora rivede le modifiche con round di `trama-advisor` avviati in background dall'agente (`run_in_background`), il cui esito Cursor consegna da solo all'agente; l'agente aspetta l'advisor solo nella revisione del Task e nella revisione finale. Questo Task copre ciò che riguarda l'Actor `editor-chat` e i Requisiti di qualità della chat; il comportamento dei round, gli hook e il sotto-agente sono di un altro Task della stessa Proposal.

Quando il Task è finito vale quanto segue.

- `editor-chat.TOOL_FINISHED`: il testo che Trama aggiunge al risultato di uno strumento (`postToolUse` con `additional_context`) serve solo a chiedere all'agente un round di revisione continua. Le note dei round non passano mai da qui, perché arrivano all'agente come esito del round. Va controllato nel codice degli hook e dell'host (`src/core/cursor-chat.ts`, `extension/src/host/drift-resolution.ts`) che nessun percorso aggiunga ancora le note a `additional_context`.
- Riservatezza (`quality#editor-chat`): all'editor arrivano, oltre a ciò che già arriva, solo i percorsi dei file cambiati, relativi al progetto, le loro impronte e il percorso della trascrizione della conversazione (`transcript_path`). Non arrivano mai il contenuto, il comando o il suo output. Della trascrizione Trama legge soltanto la dimensione dai metadati del file (`fs.stat`), mai il contenuto: la legge solo `trama-advisor`. Le note stanno solo nella memoria dell'editor e arrivano solo all'agente che le riguarda.
- Compatibilità (`quality#editor-chat`): lo smoke test di accettazione di ogni nuova versione di Cursor, nella sezione «R. Cursor» di `docs/uat.md`, controlla anche:
  - un Run con l'Advisor Scanner fa almeno un round di revisione continua e una revisione finale;
  - il round parte in background con `run_in_background`, e l'agente non lo aspetta e non lo controlla (niente `sleep`, nessuna lettura della trascrizione del round o di `~/.cursor/subagents/`);
  - l'esito del round arriva all'agente da solo, consegnato da Cursor;
  - la richiesta del round porta la trascrizione dell'agente con una posizione in byte.
- La sezione dichiara 3.27.6 come prima versione provata così per i round in background. Il testo «Tested: 3.22.12 and 3.23.12» non vale più per l'Advisor della chat. Una versione in cui un pezzo non funziona resta supportata con quel pezzo che ripiega come dice `rules#chat-advisor`.
