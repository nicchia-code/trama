---
column: done
technical: false
refs:
  - prenotazione-file
drift: snjzl3et
proposal: 8vuvkoxz
agent: false
created: 2026-10-24T08:54:06.074Z
finished: 2026-10-24T09:20:38.914Z
unchanged: "Already implemented: extension/src/omp/trama-hook.ts reads TRAMA_TASK and TRAMA_PARALLEL, recordConflict runs trama timing new with kind conflict, and extension/src/host/terminal-agent.ts sets both variables. test/omp-hook.test.ts (16 tests, bun test) passes, including the conflict timing case."
---
# Fix code to match the Model: Conflitto di prenotazione non registrato

## What happens

Un sotto-agente di una Run fermato da una prenotazione non registra alcun conflitto con `trama timing new`, nemmeno con Parallel Execution attivo: l'hook non conosce il Task del sotto-agente, il Task che tiene il file né l'impostazione.

## What should happen

Con Parallel Execution il sotto-agente fermato da una prenotazione registra il conflitto con `trama timing new` (`kind: conflict`), come per ogni conflitto.

## Chosen option

**Registrare dall'hook**

L'host passa per variabile d'ambiente il Task del terminale e l'impostazione Parallel Execution; la prenotazione salva il Task del titolare; l'hook esegue `trama timing new` al blocco.

## Where in the code

extension/src/omp/trama-hook.ts (blocco in tool_call); src/core/claims.ts (claimWrites)
