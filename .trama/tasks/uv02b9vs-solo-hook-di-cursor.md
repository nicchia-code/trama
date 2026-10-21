---
column: done
technical: false
refs:
  - editor-chat
  - editor-chat.AGENT_INTERRUPTED
  - editor-chat.CONVERSATION_CLOSED
  - requirements/tech#editor-chat
  - requirements/quality#editor-chat
  - requirements/cli#General
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T05:01:36.080Z
---
# Solo hook di Cursor

Quando il Task è fatto, la chat dell'editor che Trama segue è solo quella di Cursor, con i suoi hook, e produce tutti e quattro gli Event (`PROMPT_SUBMITTED`, `AGENT_STOPPED`, `AGENT_INTERRUPTED`, `CONVERSATION_CLOSED`) come oggi.

- Sparisce tutto il supporto alla chat di Copilot: il comando `trama hook copilot` (`runCopilotHook` e la voce in `HOOK_COMMANDS` di `src/cli/commands/hook.ts`), `src/core/copilot-chat.ts`, in `src/core/question-channel.ts` `onCopilotHook`, `sendCopilotHook` e il ramo del messaggio `copilot-hook` (`editorsSayTrama` resta, solo per gli hook di Cursor), `extension/src/host/copilot-chat.ts` con `onCopilotChatEvent` e ogni suo ascoltatore (`agent.ts`, `announcements.ts`, `questions.ts`), e in `extension/src/host/drift-resolution.ts` i turni e i lavori di Copilot (`copilotTurns`, `copilotTurnStarted`, `copilotTurnEnded`, `bindCopilotChatJob`, `endCopilotChatJobs`, i valori `"copilot"` e `"other"` del luogo del lavoro e il ramo `"editor"` di `followsAgent` che c'era per Copilot). `trama hook copilot` e `trama hook claude-question-tool` diventano comandi sconosciuti: errore d'uso, assenti da `trama --help`, da `trama hook --help` e da `docs/cli.md`.
- Gli hook rimasti sono `trama hook cursor` e `trama hook idle`; `hook cursor` legge il JSON da standard input ed esce sempre con 0, con i limiti di tempo di oggi (1 secondo per `beforeSubmitPrompt` e per la domanda sul tool di domande, 5 secondi per `stop`, `sessionEnd` e `afterShellExecution`).
- Il rifiuto del tool di domande nella chat guarda solo `AskQuestion` di Cursor e risponde solo nella forma di Cursor (`{"permission": "deny", "agent_message": "<messaggio>"}`).
- La fine di un turno, l'interruzione o la chiusura di una conversazione di Trama nella chat di Cursor finiscono anche il lavoro archiviato con la provenienza `editor` (le schede di un agente che Trama non ha avviato e che aspettavano la fine di un turno di chat), come oggi lo finiva la fine di un turno di Copilot: oltre a `releaseTakenTasks` e `endFiledWork` per `cursor`, l'ascoltatore degli eventi di Cursor chiama `endFiledWork` anche per `editor`.
- Pulizia di Copilot all'attivazione: a ogni attivazione dell'estensione in un editor che non è Cursor si cancella `copilot-hooks.json` da `ExtensionContext.globalStorageUri`, se c'è, e si toglie da `chat.hookFilesLocations` (impostazioni utente, `ConfigurationTarget.Global`) soltanto la voce con il suo percorso, senza toccare le altre; senza file né voce non si scrive nulla e un errore non mostra nulla. Usa la stessa funzione di rimozione del Task del progetto, che la chiama anche da Update skills e dal controllo all'apertura. In Cursor non si tocca nulla di questo; `installCopilotHooks` non esiste più.
- Le voci di Trama in `~/.cursor/hooks.json` contengono solo un percorso locale e i `matcher`; gli hook non conservano prompt, righe di comando o output. La descrizione di `skillsDir` di `trama project new` e `trama project edit` dice solo il predefinito `.agents/skills`.
- I test di Copilot (`test/copilot-chat.test.ts`, le parti di Copilot di `test/cli-registry.test.ts`, `test/question-channel.test.ts`, `test/host-drift-resolution.test.ts`, `test/host-agent-terminals.test.ts`) si tolgono; un test verifica che un evento di fine turno della chat di Cursor finisca anche il lavoro archiviato con provenienza `editor`.
