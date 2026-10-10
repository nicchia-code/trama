---
column: done
technical: false
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
  - requirements/tech#agent-hook
drift: 3o5kdq10
proposal: null
agent: false
created: 2026-10-09T23:06:16.932Z
finished: 2026-10-09T23:08:25.342Z
---
# Fix code to match the Model: External window stops releasing a hooked agent's Tasks after its first quiet period

## What happens

Con omp in una **finestra esterna**, la prima volta che la finestra resta quieta per quindici minuti i Task presi sono rilasciati, ma da quel momento la finestra **non è più seguita** dalla quiete fino alla sua corsa successiva.

Se l'agente riprende nella stessa finestra (per esempio il developer gli scrive un nuovo prompt, o l'hook non è caricato e il lavoro continua) e prende un altro Task, e poi omp si blocca o la finestra è chiusa a mano, quel Task **resta preso per sempre**: nessuna quiete lo rilascia. Nel terminale integrato e nella sua scheda, invece, la quiete continua a valere finché il terminale è aperto.

## What should happen

Un Task preso dal terminale di un agente con un hook torna in To do dopo quindici minuti senza attività di quel terminale (né comandi di Trama né segnale di vita), **ogni volta** che succede e qualunque sia il launcher.

Per una finestra esterna questo vale per tutta la sua corsa, non solo per il primo periodo di quiete: un Task preso dopo un rilascio è rilasciato anch'esso quando la finestra torna quieta, come nel terminale integrato.

## Chosen option

**Keep following until the command ends**

La finestra esterna con omp resta seguita dalla quiete finché il suo marcatore di fine non arriva, anche dopo un rilascio: ogni Task che riprende viene rilasciato quindici minuti dopo l'ultima attività. Costa un controllo in più ogni trenta secondi per finestra, che non trova nulla da rilasciare se nessun Task è preso.

## Where in the code

`extension/src/host/agent.ts`: `releaseQuietHookedTasks` (removes the window from `hookedExternal` after the first release), `startExternalRun`.
