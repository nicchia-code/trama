---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:45:46.904Z
---
# Terminale agente senza delega

Quando il Task è fatto, l'Agent terminal nasce solo per `developer.ASK_AGENT`: non si apre più nessun terminale per una raccolta automatica o per un Run automatico di correzioni e origini. L'istruzione di Resolve Drifts è sempre una richiesta manuale e nomina soltanto il Drift scelto; non esistono più istruzioni automatiche (raccolta, Run autorizzato).

I nomi dei terminali non prevedono più Resolve all. Le frasi sulla lingua e sul blocco dei Drift non contengono più istruzioni di delega. La fine di un lavoro non viene più notificata alle altre finestre dell'editor: ogni finestra conosce solo i propri lavori. La regola sul focus del terminale segue la nuova formulazione del Requisito.

Indizi: `extension/src/host/prompts.ts` (automaticCollection, buildAutomaticRunPrompt), `extension/src/host/agent.ts` (userDelegation, reserve/release send, broadcastJob; resta il passaggio di runEnds), `extension/src/host/terminal-agent.ts` (`TRAMA_JOB` resta solo per i tempi delle fasi), `extension/src/host/controller.ts`.
