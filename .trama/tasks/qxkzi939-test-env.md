---
column: done
technical: true
refs:
  - requirements/quality#General
drift: null
proposal: 6lu8dihg
agent: false
created: 2026-10-26T18:05:06.344Z
finished: 2026-10-26T18:06:30.586Z
---
# Test senza variabili della shell

Quando il Task è fatto, `bun test --isolate` passa allo stesso modo con e senza le variabili d'ambiente di Trama (`TRAMA_*`, per esempio `TRAMA_ACP`, `TRAMA_TERMINAL`, `TRAMA_AGENT`, `TRAMA_QUESTION_ENDPOINT`) e `BUN_INSTALL` nella shell che lo lancia, come dice `quality#General`.

Oggi la suite fallisce in 3 test quando la lancia un agente di Trama in omp Chat dalla shell fish del developer, senza che il codice sia sbagliato:
- `test/omp-hook.test.ts`, `only main session completion emits idle; ends and timers emit nothing` e `the main session says once which process is the agent, at session_start or else agent_start; sub-agents and sessions without agent say nothing`: il `beforeEach` imposta `TRAMA_TERMINAL` ma eredita `TRAMA_ACP=1`, e allora l'hook (`extension/src/omp/trama-hook.ts`, blocco `if (!acp)`) giustamente non registra `session_start`, `agent_start`, `session_stop` e `session_shutdown`.
- `test/host-agent-terminals.test.ts`, `omp before a launch > the command and the PATH of the terminal use the program the check found, with the folders of omp and bun in front`: eredita `BUN_INSTALL`, e `bunBinDir` (`extension/src/host/model-lists.ts`) giustamente sceglie `BUN_INSTALL/bin` invece di `~/.bun/bin` della home finta del test.

Decisioni prese con il developer:
- La correzione sta nel preload della suite, non nei singoli test: il preload di `bun test` registrato in `bunfig.toml` (oggi `test/happydom.ts`, che registra happy-dom) toglie all'avvio da `process.env` ogni variabile che comincia con `TRAMA_` e `BUN_INSTALL`. Ogni test che ha bisogno di una di quelle variabili la imposta da sé e rimette il valore di prima alla fine, come già fanno i test di `TRAMA_ACP` in `test/omp-hook.test.ts` e i test di `bunBinDir` in `test/model-lists.test.ts`.
- Il test del PATH del terminale resta sul caso senza `BUN_INSTALL`: si aspetta, dopo la cartella di omp trovata, `~/.bun/bin` della home finta, come oggi. Il caso con `BUN_INSTALL` resta coperto da `test/model-lists.test.ts`.
- Il codice di produzione non cambia: hook e PATH del terminale fanno già ciò che dicono i Requisiti.

Verifica: la suite intera passa lanciata con `TRAMA_ACP=1 TRAMA_TERMINAL=x BUN_INSTALL=/tmp/elsewhere` impostate e passa senza; nessun test lasciato a dipendere da quelle variabili ereditate.
