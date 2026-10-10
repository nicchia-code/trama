---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
proposal: null
task: ro8wlyif
origin: null
option: 1
note: null
resolvedBy: vgoluaem
created: 2026-10-10T10:20:42.461Z
---
# Quiet period of an idle hooked terminal keeps releasing Tasks taken later

## What happens

Quando nell'editor resta aperto il terminale integrato di un agente con hook (omp) che **non mostra attività da quindici minuti** (per esempio perché il suo comando è finito da tempo, o perché non ha ancora dato segni di vita), la sua quiete viene considerata trascorsa **di nuovo ogni mezzo minuto**, senza fine.

Ogni volta rilascia i Task presi dall'agente **senza un terminale riconosciuto**: un Task preso così torna in To do entro pochi secondi da quando l'agente lo ha preso, anche se quell'agente ci sta lavorando, e Run all To do torna disponibile su di lui.

## What should happen

La quiete di un terminale con hook **trascorre una volta**, quindici minuti dopo l'ultima attività di quel terminale, e rilascia solo i Task presi in quel momento: quelli del terminale stesso e quelli presi senza un terminale riconosciuto.

Un Task preso dopo, senza un terminale riconosciuto, resta **Taken by the agent** finché non arriva un altro evento che rilascia i Task presi (fine di un comando, hook a riposo, chiusura di un terminale con hook, fine di un turno della chat, o una **nuova** quiete trascorsa).

## Fix options

### Far trascorrere la quiete una sola volta

Il terminale con hook conta la quiete una volta per ogni periodo di silenzio: trascorsi i quindici minuti rilascia ciò che è preso in quel momento e poi non rilascia altro finché non mostra di nuovo attività e torna in silenzio. Il comportamento dei Task presi da quel terminale non cambia. Costa ricordare, per ogni terminale, se la sua quiete corrente è già stata contata.

### Contare la quiete solo mentre il terminale ha un Run

La quiete di un terminale con hook conta solo mentre in esso gira un comando dell'agente avviato da Trama, contando dall'inizio di quel comando come per le finestre esterne. Un terminale rimasto aperto dopo la fine del comando non rilascia più nulla. Resta il rilascio ripetuto durante un Run lungo e silenzioso, ma è raro perché il segnale di vita dell'hook lo tiene attivo.

### Adeguare il Modello al codice

Si tiene il codice e si precisa nel Modello che un Task preso senza un terminale riconosciuto è rilasciato appena un qualsiasi terminale con hook aperto è in silenzio da quindici minuti, anche se la quiete era già trascorsa prima che il Task fosse preso. Non costa codice, ma rende quasi inutile la presa senza terminale finché resta aperto un terminale omp inattivo.

## Where in the code

`extension/src/host/agent.ts`: `releaseQuietHookedTasks`, chiamata ogni 30 s da `watchAgentTerminal`, e `agentTerminals` che tiene il terminale integrato con hook anche dopo la fine del suo comando; `extension/src/host/terminal-activity.ts`: `terminalSeenAt`; `src/core/work.ts`: `releaseTasks`, che rilascia sempre anche i Task senza chi li ha presi.
