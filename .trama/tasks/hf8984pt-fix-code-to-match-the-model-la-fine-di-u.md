---
column: done
technical: false
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/data#task
drift: xpd9xz83
proposal: null
agent: false
created: 2026-10-06T12:58:04.991Z
---
# Fix code to match the Model: La fine di un terminale dell'agente rilascia anche i Task presi da un altro terminale

## What happens

Il segno di un Task preso dice solo **che** un agente lo ha preso, non **quale terminale**. Quando finisce un comando in un qualunque terminale dell'agente della cartella aperta (integrato o finestra esterna), Trama riporta in To do **ogni** Task preso di quel progetto.

Con due agenti al lavoro nella stessa cartella (per esempio una corsa in un terminale e una scansione lanciata in un secondo terminale, perché il primo è occupato), la fine della scansione rilascia anche i Task che la corsa sta ancora realizzando: tornano in To do mentre l'agente ci lavora.

## What should happen

Il Modello rilascia con `terminal.COMMAND_ENDED` solo i Task presi **dal terminale il cui comando è finito**: «la fine di un altro terminale non rilascia nulla qui».

Il Requisito dei dati di task prevede però solo un segno sì/no (`agent`), che non può dire quale terminale ha preso il Task. Per i Task della chat di Cursor il developer ha già deciso di dare per scontato un solo sistema alla volta; per due terminali Trama della stessa cartella la decisione manca.

## Chosen option

**Ricordare quale terminale ha preso il Task**

Il segno del Task registra l'identità del terminale che lo ha preso; la fine di un comando rilascia solo i Task di quel terminale. I Task presi prima del cambio contano come di qualunque terminale. Costo: il Requisito dei dati di task cambia (il campo `agent` porta l'identità) e la chat di Cursor va segnata a parte; un agente parallelo non perde più i suoi Task.

## Where in the code

extension/src/host/agent.ts (`watchAgentTerminal`, `watchExternalRuns`, `releaseTakenTasks`); src/core/work.ts (`releaseTasks`)
