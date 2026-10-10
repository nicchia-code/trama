---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#task
proposal: null
task: okybf3vo
origin: null
option: 1
note: null
resolvedBy: g6eu10uj
created: 2026-10-10T10:53:53.323Z
---
# A new hooked integrated terminal counts as quiet before its first activity and releases Tasks taken without a terminal

## What happens

Per un terminale integrato con hook (omp) appena aperto, la quiete parte da **nessuna attività**: finché l'agente non ha mandato il primo segnale di vita o il primo comando di Trama, il controllo periodico (ogni 30 secondi) considera trascorsi i quindici minuti.

- Il terminale non ha ancora preso Task, ma la sua quiete rilascia **ogni Task preso senza un terminale riconosciuto**, che torna in To do pochi secondi dopo l'avvio di una corsa qualsiasi.
- La finestra esterna invece conta la quiete dall'inizio della sua corsa, e così fa il job del terminale integrato.

## What should happen

Il Modello rilascia un Task per quiete solo se **per quindici minuti** quel terminale non ha mostrato attività: né un comando di Trama dell'agente né il segnale di vita del suo hook.

Un Task preso senza terminale riconosciuto è rilasciato dalla quiete di quel terminale, ma solo quando quella quiete è davvero trascorsa (rules#task: «la quiete di quel terminale»). Un terminale aperto da pochi secondi non è rimasto quieto per quindici minuti, quindi non rilascia niente.

## Fix options

### Far partire la quiete dall'inizio della corsa

Il terminale integrato con hook ricorda l'istante in cui Trama vi ha scritto l'istruzione, come già fa la finestra esterna, e la quiete conta dal più recente fra quell'istante, l'ultima attività e la chiusura dell'ultimo giro di domande. Un terminale riusato riparte dalla nuova corsa. Cambio piccolo e allineato al job e alla finestra esterna.

### Ignorare la quiete finché il terminale non ha mostrato attività

Un terminale con hook che non ha ancora mandato né un segnale di vita né un comando non ha quiete da contare. Basta un controllo, ma un agente con hook che non parte mai non rilascia per quiete i Task presi senza terminale: restano presi finché un altro evento li rilascia o il developer li riprende.

### Cambiare il Modello

Si scrive nel Modello che la quiete di un terminale senza attività vale già come trascorsa, e quindi che l'avvio di una corsa con hook rilascia subito i Task presi senza terminale riconosciuto. Nessun cambio al codice, ma un Task su cui un agente lavora torna in To do senza motivo visibile.

## Where in the code

extension/src/host/agent.ts: releaseQuietHookedTasks e quietElapsed (ramo dei terminali integrati, senza istante di inizio come quello di hookedExternal); extension/src/host/terminal-activity.ts: terminalSeenAt vale 0 prima della prima attività
