---
column: done
technical: false
refs:
  - time
  - agent.CHECK_TASK
  - requirements/rules#time
  - requirements/tech#time
  - requirements/ui#time
  - requirements/rules#agent.CHECK_TASK
  - requirements/tech#agent.CHECK_TASK
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:09:03.372Z
---
# Controllo di esecuzione omp

Il controllo di esecuzione guarda soltanto fatti certi di omp: se il processo dell'agente esiste ancora, se il terminale esiste ancora, se qualche finestra aperta del progetto segue ancora chi tiene un Task. Alla fine:

- Non esiste più il caso del lavoro della chat di Cursor mai legato alla sua conversazione: niente `Job.started` usato per i 60 secondi, niente `endUnboundChatJobs` né `CHAT_BIND_WAIT_MS` (`extension/src/host/drift-resolution.ts`, `extension/src/host/agent.ts`), niente motivo `the chat never started its conversation` e niente avviso `Cursor ended the session (…)` dopo un `sessionEnd`.
- I Task che nessuna finestra segue sono soltanto quelli il cui `agent` è l'identità di un terminale di Trama (una conversazione di omp Chat ha quella del terminale che sostituisce); il messaggio `followed-holders` chiede solo terminali, e una finestra risponde con i suoi terminali in Agent running e le sue conversazioni di omp Chat con un lavoro (`src/core/task-holders.ts`, `extension/src/host/execution-check.ts`, `src/core/question-channel.ts`). Non c'è più il titolare `cursor:<conversazione>` né il titolare `cursor`.
- `trama task check <id>` risponde senza contattare l'editor solo per un Task senza `agent` o con `agent: true` (titolare sconosciuto); il caso `cursor` sparisce da `src/cli/commands/task.ts`. Le risposte restano: vivo, liberato con il motivo, non preso dall'agente, preso senza un titolare noto, non verificabile.
- L'avviso `Trama stopped following <lavoro>: <motivo>.` ha come `<lavoro>` il nome del terminale o della conversazione e come `<motivo>` solo `the agent's process is gone` o `the terminal is gone` (più quello della ripresa di omp Chat che già esiste), con lo stile degli avvisi dei ghost.

Test da aggiornare: `test/task-holders.test.ts`, `test/task-check.test.ts`, `test/host-task-check.test.ts`, i casi del controllo in `test/host-agent-terminals.test.ts` e `test/host-drift-resolution.test.ts` che usano la chat di Cursor.
