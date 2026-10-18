---
technical: false
refs:
  - editor-chat
  - question-round/Not asked/agent.TOOL_DOMANDE_CHIAMATO
  - requirements/tech#editor-chat
  - requirements/quality#editor-chat
---
# Hook delle chat contro domande

In una conversazione di Trama della chat di Cursor o di Copilot, l'agente che prova a fare una domanda con il proprio strumento di domande riceve un rifiuto: nessuna domanda compare e l'agente riceve il messaggio di rifiuto comune (definito una volta sola nel codice condiviso, vedi `tech#question-round`) di chiedere solo con `trama ask`. Nelle conversazioni che non sono di Trama, o quando l'hook non riesce a stabilire che la conversazione è di Trama, lo strumento passa come sempre.

- Cursor: `writeCursorHooks` (`src/core/cursor-chat.ts`) scrive anche la voce `preToolUse` con il `matcher` del tool di domande (`AskQuestion`, da confermare con una prova manuale in Cursor; se Cursor non accetta il `matcher` per quel tool, la voce resta senza `matcher` e l'hook decide da `tool_name`). Il riconoscimento delle voci di Trama all'attivazione considera anche questa voce e il suo `matcher`. `trama cursor-hook` per `preToolUse` legge `tool_name`: per un tool che non è quello di domande risponde subito `{}`, senza leggere le registrazioni né contattare l'editor; per il tool di domande chiede alle finestre vive del progetto, con il limite di 1 secondo, se `conversation_id` è di Trama e, se almeno una risponde di sì, risponde `{"permission": "deny", "agent_message": "<messaggio>"}`.
- Copilot: `installCopilotHooks` (`extension/src/host/project.ts`) scrive anche `PreToolUse` in `copilot-hooks.json`, e `src/core/copilot-chat.ts` accetta questo evento. `trama copilot-hook` per `PreToolUse` fa lo stesso con `vscode_askQuestions` e `session_id`, e rifiuta con `hookSpecificOutput` (`permissionDecision: "deny"`, `permissionDecisionReason` con il messaggio).
- L'host dell'estensione risponde alla domanda «questa conversazione è di Trama?» con l'elenco delle conversazioni di Trama che ha in memoria, senza produrre nessun Event. All'host arrivano solo l'identificatore della conversazione e la cartella del progetto, mai il contenuto della domanda.
- Ogni guasto (nessun editor, nessun progetto Trama, nessuna finestra che risponde in tempo, risposta negativa, errore) risponde `{}` e lascia passare il tool; gli hook escono sempre con 0 e continuano a non bloccare nient'altro.

Fatto quando: i test coprono, per entrambe le chat, il tool di domande rifiutato in una conversazione di Trama, lasciato passare in una che non è di Trama e con l'editor che non risponde, e un altro tool che passa senza contattare l'editor; le voci scritte in `~/.cursor/hooks.json` e in `copilot-hooks.json` hanno la nuova voce. Lo smoke test dell'accettazione (`docs/uat.md`) aggiunge la prova del rifiuto in Cursor e in VS Code.
