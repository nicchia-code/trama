---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#drift-resolution
  - drift-resolution/Running tasks
proposal: null
task: vvyej7hn
origin: null
critical: false
option: 1
note: null
resolvedBy: zg1i0cej
created: 2026-10-14T12:37:29.809Z
---
# An interrupted pre-flight is recorded as a failed scan only in the window that ran it

## What happens

Quando il Run termina senza aver dichiarato il suo pre-flight, il pre-flight viene ritirato e registrato come scan fallito solo nella finestra che ha lanciato il Run. Il coordinatore del progetto, quando risponde allo stato dell'automatismo, non lo vede: il suo ultimo scan fallito non lo riporta, anche se il pre-flight è stato interrotto.

## What should happen

Il Model dice che un pre-flight fallito o interrotto è registrato come **scan fallito**, e il Requisito dice che il coordinatore riporta l'ultimo scan fallito del progetto in ogni finestra. Un pre-flight interrotto in una finestra diversa dal coordinatore deve quindi comparire anche nello stato del progetto, come già accade per un pre-flight chiuso con esito fallito.

## Fix options

### Inoltrare al coordinatore il pre-flight interrotto

Quando un pre-flight viene ritirato perché il Run è finito senza dichiararlo, la finestra che l'ha seguito avvisa il coordinatore, come per un controllo chiuso con esito fallito. Lo stato del progetto mostra così l'ultimo scan fallito anche per un pre-flight interrotto altrove. Costo: un messaggio in più alla fine di ogni Run; se il coordinatore non risponde il dato si perde, come oggi per i controlli falliti.

### Ricavarlo dal Run chiuso lato coordinatore

Alla fine di un Run il coordinatore considera fallito il pre-flight del Run se non ha ricevuto un esito riuscito, senza dipendere dalla finestra che l'ha seguito. Costo: il coordinatore deve ricordare quali Run hanno annunciato un pre-flight, e un Run il cui pre-flight non è mai stato annunciato non lascia traccia.

## Where in the code

extension/src/host/announcements.ts (withdrawWaiting, che chiama recordInterruptedPreflight); extension/src/host/drift-resolution.ts (recordInterruptedPreflight, che registra solo localmente)
