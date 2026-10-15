---
column: done
technical: false
refs:
  - requirements/rules#drift-resolution
  - drift-resolution/Running tasks
drift: hed998g4
proposal: null
agent: false
created: 2026-10-14T12:38:57.545Z
finished: 2026-10-14T12:43:50.864Z
---
# Fix code to match the Model: An interrupted pre-flight is recorded as a failed scan only in the window that ran it

## What happens

Quando il Run termina senza aver dichiarato il suo pre-flight, il pre-flight viene ritirato e registrato come scan fallito solo nella finestra che ha lanciato il Run. Il coordinatore del progetto, quando risponde allo stato dell'automatismo, non lo vede: il suo ultimo scan fallito non lo riporta, anche se il pre-flight è stato interrotto.

## What should happen

Il Model dice che un pre-flight fallito o interrotto è registrato come **scan fallito**, e il Requisito dice che il coordinatore riporta l'ultimo scan fallito del progetto in ogni finestra. Un pre-flight interrotto in una finestra diversa dal coordinatore deve quindi comparire anche nello stato del progetto, come già accade per un pre-flight chiuso con esito fallito.

## Chosen option

**Inoltrare al coordinatore il pre-flight interrotto**

Quando un pre-flight viene ritirato perché il Run è finito senza dichiararlo, la finestra che l'ha seguito avvisa il coordinatore, come per un controllo chiuso con esito fallito. Lo stato del progetto mostra così l'ultimo scan fallito anche per un pre-flight interrotto altrove. Costo: un messaggio in più alla fine di ogni Run; se il coordinatore non risponde il dato si perde, come oggi per i controlli falliti.

## Where in the code

extension/src/host/announcements.ts (withdrawWaiting, che chiama recordInterruptedPreflight); extension/src/host/drift-resolution.ts (recordInterruptedPreflight, che registra solo localmente)
