---
status: resolved
resolution: fix-code
refs:
  - panel/Board
  - requirements/ui#panel/Board
proposal: null
task: fbqlp4da
origin: null
option: 1
note: null
created: 2026-10-06T18:54:48.293Z
---
# Il periodo Done include schede finite nei giorni futuri

## What happens

Il filtro Done applica soltanto il limite iniziale del periodo. Con il giorno locale al 6 ottobre, scegliendo Today compare anche una scheda con fine il 7 ottobre, sotto l intestazione del giorno futuro, ed entra nel contatore. Lo stesso avviene con Last 7 days e Last 30 days. Il caso può verificarsi quando la data di fine registrata proviene da una macchina con orologio avanti.

## What should happen

**Today è soltanto il giorno locale in corso**; Last 7 days e Last 30 days includono oggi e rispettivamente i sei o ventinove giorni locali precedenti. Le schede di giorni futuri non appartengono a questi periodi e non devono comparire né essere contate. La scelta All continua a mostrare tutte le schede datate e il gruppo No date.

## Fix options

### Delimitare entrambi gli estremi del periodo

Per i tre periodi limitati mostrare soltanto le schede finite dall inizio del primo giorno incluso fino all inizio del giorno locale successivo a oggi, escluso. All rimane senza limiti. Si rispettano i periodi richiesti anche quando una data arriva da un orologio avanti; occorre verificare i confini di mezzanotte e il cambio dell ora locale.

### Separare le date future dalla vista del periodo

Escludere le date dei giorni futuri dal periodo selezionato e renderle consultabili solo con All, accompagnate da un indicazione della data anomala. La definizione dei periodi resta rispettata e il developer può riconoscere il disallineamento degli orologi. Rispetto al semplice intervallo delimitato, comporta anche stabilire e aggiungere una presentazione esplicita per queste schede.

## Where in the code

extension/src/webview/board/logic.ts: doneGroups
