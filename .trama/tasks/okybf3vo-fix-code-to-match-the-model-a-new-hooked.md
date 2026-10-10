---
column: done
technical: false
refs:
  - task/Taken by the agent/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#task
drift: yibn9r5w
proposal: null
agent: false
created: 2026-10-10T11:14:40.612Z
finished: 2026-10-10T11:16:32.296Z
---
# Fix code to match the Model: A new hooked integrated terminal counts as quiet before its first activity and releases Tasks taken without a terminal

## What happens

Per un terminale integrato con hook (omp) appena aperto, la quiete parte da **nessuna attività**: finché l'agente non ha mandato il primo segnale di vita o il primo comando di Trama, il controllo periodico (ogni 30 secondi) considera trascorsi i quindici minuti.

- Il terminale non ha ancora preso Task, ma la sua quiete rilascia **ogni Task preso senza un terminale riconosciuto**, che torna in To do pochi secondi dopo l'avvio di una corsa qualsiasi.
- La finestra esterna invece conta la quiete dall'inizio della sua corsa, e così fa il job del terminale integrato.

## What should happen

Il Modello rilascia un Task per quiete solo se **per quindici minuti** quel terminale non ha mostrato attività: né un comando di Trama dell'agente né il segnale di vita del suo hook.

Un Task preso senza terminale riconosciuto è rilasciato dalla quiete di quel terminale, ma solo quando quella quiete è davvero trascorsa (rules#task: «la quiete di quel terminale»). Un terminale aperto da pochi secondi non è rimasto quieto per quindici minuti, quindi non rilascia niente.

## Chosen option

**Far partire la quiete dall'inizio della corsa**

Il terminale integrato con hook ricorda l'istante in cui Trama vi ha scritto l'istruzione, come già fa la finestra esterna, e la quiete conta dal più recente fra quell'istante, l'ultima attività e la chiusura dell'ultimo giro di domande. Un terminale riusato riparte dalla nuova corsa. Cambio piccolo e allineato al job e alla finestra esterna.

## Where in the code

extension/src/host/agent.ts: releaseQuietHookedTasks e quietElapsed (ramo dei terminali integrati, senza istante di inizio come quello di hookedExternal); extension/src/host/terminal-activity.ts: terminalSeenAt vale 0 prima della prima attività
