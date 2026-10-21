---
column: done
technical: false
refs:
  - task
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T04:59:20.171Z
---
# Task presi senza Copilot

Quando il Task è fatto, la presa e il rilascio dei Task non conoscono più la chat di Copilot. Un Task viene preso solo da un agente nel terminale di Trama (`TRAMA_TERMINAL`) o dall'agente della chat di Cursor (`CURSOR_AGENT`); uno spostamento in In progress fatto da un agente senza nessuno dei due, o dal developer, non prende il Task (comportamento invariato). I Task presi nella chat di Cursor sono rilasciati, come prima, a ogni fine di turno dell'agente di una conversazione di Trama dello stesso progetto, anche se l'agente aspetta solo una risposta del developer; quando riprende, rimette il Task in In progress e lo prende di nuovo.

Nel codice: in `extension/src/host/agent.ts`, `watchAgentTerminal` perde l'intero ramo `onCopilotChatEvent` (con `bindCopilotChatJob`, `releaseTakenTasks(e.root, { chat: "editor" })`, `endFiledWork(e.root, "editor")` e `endCopilotChatJobs`), e il commento della funzione non nomina più Copilot; il ramo `onCursorChatEvent` resta com'è. Le funzioni e gli import rimasti senza chiamanti per questo (gestione dei turni Copilot per il lavoro registrato con holder `editor`, ad esempio `copilotTurnStarted`/`copilotTurnEnded` in `extension/src/host/drift-resolution.ts`, se non servono altrove) vanno rimossi. In `src/core/work.ts` `holderOf` continua a riconoscere solo terminale e `cursor`; il commento non parla più della "generic chat" dell'editor, e `agentField` continua a leggere un vecchio holder `editor` come nessun holder (il Task resta dell'agente ma non preso). Nei test, `test/host-filed-drift.test.ts` perde i casi sul turno della chat di Copilot (es. "a Copilot chat filing is followed only by the window where its Trama conversation has a turn in progress") e i relativi import; restano/si aggiornano i test che verificano il rilascio a fine turno della chat di Cursor e la mancata presa senza `TRAMA_TERMINAL` né `CURSOR_AGENT`.
