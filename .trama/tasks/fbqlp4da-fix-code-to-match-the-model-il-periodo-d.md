---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: vc5qnfka
proposal: null
agent: false
created: 2026-10-06T18:57:44.676Z
finished: 2026-10-06T19:30:18.411Z
---
# Fix code to match the Model: Il periodo Done include schede finite nei giorni futuri

## What happens

Il filtro Done applica soltanto il limite iniziale del periodo. Con il giorno locale al 6 ottobre, scegliendo Today compare anche una scheda con fine il 7 ottobre, sotto l intestazione del giorno futuro, ed entra nel contatore. Lo stesso avviene con Last 7 days e Last 30 days. Il caso può verificarsi quando la data di fine registrata proviene da una macchina con orologio avanti.

## What should happen

**Today è soltanto il giorno locale in corso**; Last 7 days e Last 30 days includono oggi e rispettivamente i sei o ventinove giorni locali precedenti. Le schede di giorni futuri non appartengono a questi periodi e non devono comparire né essere contate. La scelta All continua a mostrare tutte le schede datate e il gruppo No date.

## Chosen option

**Delimitare entrambi gli estremi del periodo**

Per i tre periodi limitati mostrare soltanto le schede finite dall inizio del primo giorno incluso fino all inizio del giorno locale successivo a oggi, escluso. All rimane senza limiti. Si rispettano i periodi richiesti anche quando una data arriva da un orologio avanti; occorre verificare i confini di mezzanotte e il cambio dell ora locale.

## Where in the code

extension/src/webview/board/logic.ts: doneGroups
