---
column: done
technical: false
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
drift: wuphqg45
proposal: null
agent: false
created: 2026-10-10T10:36:32.819Z
finished: 2026-10-10T10:40:51.820Z
---
# Fix code to match the Model: Quiet period of an idle hooked terminal keeps releasing Tasks taken later

## What happens

Quando nell'editor resta aperto il terminale integrato di un agente con hook (omp) che **non mostra attività da quindici minuti** (per esempio perché il suo comando è finito da tempo, o perché non ha ancora dato segni di vita), la sua quiete viene considerata trascorsa **di nuovo ogni mezzo minuto**, senza fine.

Ogni volta rilascia i Task presi dall'agente **senza un terminale riconosciuto**: un Task preso così torna in To do entro pochi secondi da quando l'agente lo ha preso, anche se quell'agente ci sta lavorando, e Run all To do torna disponibile su di lui.

## What should happen

La quiete di un terminale con hook **trascorre una volta**, quindici minuti dopo l'ultima attività di quel terminale, e rilascia solo i Task presi in quel momento: quelli del terminale stesso e quelli presi senza un terminale riconosciuto.

Un Task preso dopo, senza un terminale riconosciuto, resta **Taken by the agent** finché non arriva un altro evento che rilascia i Task presi (fine di un comando, hook a riposo, chiusura di un terminale con hook, fine di un turno della chat, o una **nuova** quiete trascorsa).

## Chosen option

**Far trascorrere la quiete una sola volta**

Il terminale con hook conta la quiete una volta per ogni periodo di silenzio: trascorsi i quindici minuti rilascia ciò che è preso in quel momento e poi non rilascia altro finché non mostra di nuovo attività e torna in silenzio. Il comportamento dei Task presi da quel terminale non cambia. Costa ricordare, per ogni terminale, se la sua quiete corrente è già stata contata.

## Where in the code

`extension/src/host/agent.ts`: `releaseQuietHookedTasks`, chiamata ogni 30 s da `watchAgentTerminal`, e `agentTerminals` che tiene il terminale integrato con hook anche dopo la fine del suo comando; `extension/src/host/terminal-activity.ts`: `terminalSeenAt`; `src/core/work.ts`: `releaseTasks`, che rilascia sempre anche i Task senza chi li ha presi.
